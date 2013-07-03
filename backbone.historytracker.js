(function() {
  // cached super methods
  var _route = Backbone.History.prototype.route;
  var _getFragment = Backbone.History.prototype.getFragment;
  var _start = Backbone.History.prototype.start;
  var _checkUrl = Backbone.History.prototype.checkUrl;
  var _navigate = Backbone.History.prototype.navigate;
  var _extractParameters = Backbone.Router.prototype._extractParameters;

  // If we are in hash mode figure out if we are on a browser that is hit by 63777 and 85881
  //     https://bugs.webkit.org/show_bug.cgi?id=63777
  var _useReplaceState = /WebKit\/([\d.]+)/.exec(navigator.userAgent) && window.history.replaceState,

      // Some variants of android will not replace the location history properly, causing issues
      // on back navigation. Hack around the replace API making it two step for these cases.
      //
      // This is likely tied to a specific Webkit version but sticking to the environments that we
      // know this occurs in rather than trying to track down the webkit version that this might
      // be impacting and possibly getting it wrong.
      //    https://bugs.webkit.org/show_bug.cgi?id=85881
      _fakeReplace = /Android\s+([\d.]+)/.exec(navigator.userAgent) && (parseFloat(RegExp.$1) < 4.2);

  // pattern to recognize state index in hash
  var hashStrip = /^(?:#|%23)*\d*(?:#|%23)*/;
  // Cached regex for index extraction from the hash
  var indexMatch = /^(?:#|%23)*(\d+)(?:#|%23)/;

  _.extend(Backbone.Router.prototype, {
    // the direction index will be exposed on the parameters as 'direction'
    _extractParameters: function() {
      var params = _extractParameters.apply(this, arguments);
      params = params || [];
      var history = Backbone.history;
      if (history._trackDirection) {
        var oldIndex = history._directionIndex;
        history._directionIndex = history.loadIndex();
        params.direction = history._directionIndex - oldIndex;
      }
      return params;
    }
  });

  _.extend(Backbone.History.prototype, {
    // Get the location of the current route within the backbone history.
    // This should be considered a hint
    // Returns -1 if history is unknown or disabled
    getIndex : function() {
      return this._directionIndex;
    },

    getFragment : function(/* fragment, forcePushState */) {
      var rtn = _getFragment.apply(this, arguments);
      return rtn && rtn.replace(hashStrip, '');
    },

    start: function(/* options */) {
      var rtn = _start.apply(this, arguments);

      this._fakeReplace = _fakeReplace && !this.options.noReplaceHack;

      // Direction tracking setup
      this._trackDirection  = !!this.options.trackDirection;
      if (this._trackDirection) {
        var loadedIndex = this.loadIndex();
        this._directionIndex  = loadedIndex || window.history.length;
        this._state = {index: this._directionIndex};

        // If we are tracking direction ensure that we have a direction field to play with
        if (!loadedIndex) {
          var loc = window.location;
          if (!this._hasPushState) {
            loc.replace(loc.pathname + (loc.search || '') + '#' + this._directionIndex + '#' + this.fragment);
          } else {
            window.history.replaceState({index: this._directionIndex}, document.title, loc);
          }
        }
      }
      return rtn;
    },

    checkUrl : function(e) {
      var fromIframe = this.getFragment() == this.fragment && this.iframe;
      var loadedIndex = this.loadIndex(fromIframe && this.iframe.location.hash);
      var navigateOptions = {
        trigger: false,
        replace: !loadedIndex,
        forceIndex: loadedIndex || this._directionIndex + 1
      };
      _checkUrl.call(this, e, navigateOptions);
    },

    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (this._ignoreChange) {
        this._pendingNavigate = _.bind(this.navigate, this, fragment, options);
        return;
      } else if (options && options.replace && this._fakeReplace) {
        // Under older Android environment we have to back out and then trigger a route in two
        // operations rather than an automic replace operation. Without this flow does not operate
        // correctly:
        //  1. Trigger #foo
        //  2. Replace #bar
        //  3. Trigger #baz
        //
        // This will trigger all of the proper routes but the history for this case will actually
        // be #foo, #baz rather than the desired #bar, #baz, causing unexpected navigation.
        options = _.omit(options, 'replace');
        options._replace = true;
        this._pendingNavigate = _.bind(this.navigate, this, fragment, options);
        this.back();
        return;
      }

      if (!options || options === true) {
        options = {trigger: options};
      }
      var newIndex;
      if (this._trackDirection) {
        newIndex = options.forceIndex || (this._directionIndex + (options.replace ? 0 : 1));

        if (options._replace) {
          // The step back mucked with our direction tracker. Update.
          this._directionIndex++;
        }
      }
      if (this._hasPushState) {
        options.state = {index: newIndex};
      } else {
        if (this._trackDirection) {
          fragment = newIndex + '#' + fragment;
        }
      }
      _navigate.call(this, fragment, options);
    },

    _updateHash: function(location, frag, replace) {
      var base = location.toString().replace(/(javascript:|#).*$/, '') + '#';
      if (replace) {
        if (_useReplaceState) {
          window.history.replaceState({}, document.title, base + frag);
        } else {
          location.replace(base + frag);
        }
      } else {
        location.hash = frag;
      }
    },

    // Pulls the direction index out of the state or hash
    loadIndex : function(fragmentOverride) {
      if (!this._trackDirection) {
        return;
      }
      if (!fragmentOverride && this._hasPushState) {
        return (this._state && this._state.index) || 0;
      } else {
        var match = indexMatch.exec(fragmentOverride || window.location.hash);
        return (match && parseInt(match[1], 10)) || 0;
      }
    },

    route: function (route, callback) {
      return _route.call(this, route, _.bind(function(fragment) {
        var ignore = this._ignoreChange;
        if (_.isFunction(ignore)) {
          ignore = !this._ignoreChange(fragment, route);
        }

        this._ignoreChange = false;

        if (ignore) {
          this._directionIndex = Backbone.history.loadIndex();
          var pendingNavigate = this._pendingNavigate;
          if (pendingNavigate) {
              var self = this;
            _.defer(function() {
              // back() was called before pendingNavigate and it could have updated
              // this.fragment to the same as pending navigate fragment. This will make
              // navigate a NOP. Hence resetting the fragment to make sure navigate will
              // do its job.
              self.fragment = undefined;
              pendingNavigate();
            });
          }
          this._pendingNavigate = undefined;
        } else {
          callback && callback.apply(this, arguments);
        }
      }, this));
    },

    back : function(triggerRoute) {
      this.go(-1, triggerRoute);
    },

    forward : function(triggerRoute) {
      this.go(1, triggerRoute);
    },

    go : function(count, triggerRoute) {
      this._ignoreChange = _.isFunction(triggerRoute) ? triggerRoute : !triggerRoute;

      // Explicitly use `back()` and `forward()` methods since `go(1)` and `go(-1)` may behave
      // unexpectedly in different browsers, although their behavior should be equivalent; see
      // the Chromium bugs https://code.google.com/p/chromium/issues/detail?id=241888 and
      // https://code.google.com/p/chromium/issues/detail?id=244434
      switch (count) {
        case -1:
          window.history.back();
          break;
        case 1:
          window.history.forward();
          break;
        default:
          window.history.go(count);
      }
    },

    /**
     * Hack to work around iframes that make have screwed with our history state.
     * Really one should choose not to use iframes but sometimes you must, even in 2013....
     */
    stepOut: function(options) {
      options = options || {};

      var stepLimit = options.stepLimit || 10,
          routeLimit,
          desiredRoute,
          iter = 0,
          timeout;

      if (options.view) {
        options.view.$('iframe').remove();
      }

      if (_.isString(options.trigger)) {
        // If a string is passed then we will ensure that they land on the desired route one way
        // or the other
        desiredRoute = options.trigger;
        routeLimit = options.routeLimit || 1;

        options.trigger = function(fragment) {
          routeLimit--;

          if (fragment === desiredRoute) {
            return true;
          } else if (routeLimit <= 0) {
            Backbone.history.navigate(desiredRoute, {replace: true, trigger: true});
            _.defer(function() {
              options.callback && options.callback(desiredRoute, false);
            });
          } else {
            _.defer(step);
          }
        };
      }

      // General flow here is to try to do a back navigation and wait for a backbone event to trigger
      // If one does not within a given timeout then repeat.
      function step() {
        iter++;

        // Timeout before as some envs actually have a sync callback for back. (Android 2.x notably)
        timeout = setTimeout(function() {
          if (iter > stepLimit) {
            options.callback && options.callback(false);
          } else {
            step();
          }
        }, 300);

        Backbone.history.back(function(fragment) {
          clearTimeout(timeout);

          var trigger = _.isFunction(options.trigger) ? options.trigger.apply(this, arguments) : options.trigger;
          if (trigger || !desiredRoute) {
            // Defer a callback since it can potentially call history's methods that the current execution would
            // interfere with (history methods rely on history state like history._ingoreChange)
            options.callback && _.defer(function() { options.callback(fragment, !!trigger); });
          }
          return trigger;
        });
      }

      step();
    }
  });

}());
