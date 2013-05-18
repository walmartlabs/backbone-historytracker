/*global async */
$(document).ready(function() {

  var router = null;
  var lastRoute = null;
  var lastArgs = [];
  var steps = [];
  var startingIndex;

  function onRoute(router, route, args) {
    lastRoute = route;
    lastArgs = args;
  }

  function routeBind(callback) {
    var handler = function() {
      var args = arguments;
      Backbone.history.unbind('route', handler);

      // Let the route execute before we verify
      setTimeout(function() {
        callback.apply(undefined, args);
      }, 0);
    };
    Backbone.history.bind('route', handler);
  }

  function step(page, direction, offset, callback) {
    var index = steps.length;
    steps[index] = function(router, name, params) {
      var hist = Backbone.history;
      equals(hist.getFragment(), 'search/manhattan/p' + page);
      equals(params.direction, direction, 'route direction');
      equals(hist.getIndex(), startingIndex+offset, 'history index');
      equals(router.query, 'manhattan');
      equals(router.page, page);

      if (steps[index + 1]) {
        routeBind(steps[index + 1]);
      }
      setTimeout(callback, 0);
    };
  }

  function cleanup() {
    if (window.testPushState) {
      window.history.pushState({}, document.title, originalUrl);
    } else {
      window.location.hash = '';
    }
    start();
  }

  module("Backbone.Historytracker", {

    setup: function() {
      Backbone.history = null;
      router = new Router({testing: 101});
      Backbone.history.interval = 9;
      Backbone.history.start({pushState: window.testPushState, root: '/foo/', trackDirection: true});
      lastRoute = null;
      lastArgs = [];
      Backbone.history.on('route', onRoute);

      steps = [];
      startingIndex = Backbone.history.getIndex();
    },

    teardown: function() {
      Backbone.history.stop();
      Backbone.history.off('route', onRoute);
    }

  });

  var Router = Backbone.Router.extend({
    routes: {
      "search/:query":              "search",
      "search/:query/p:page":       "search"
    },

    search : function(query, page) {
      this.query = query;
      this.page = page;
    }
  });

  asyncTest("Router: index delta", 40, function() {
    step('20', 1, 1, function() {
      Backbone.history.navigate('search/manhattan/p30', {replace: true, trigger: true});
    });
    step('30', 0, 1, function() {
      Backbone.history.navigate('search/manhattan/p40', true);
    });
    step('40', 1, 2, function() {
      Backbone.history.back(true);
    });
    step('30', -1, 1, function() {
      Backbone.history.navigate('search/manhattan/p50', true);
    });
    step('50', 1, 2, function() {
      Backbone.history.navigate('search/manhattan/p60', true);
    });
    step('60', 1, 3, function() {
      Backbone.history.go(-2, false);
      Backbone.history.navigate('search/manhattan/p70', true);
    });
    step('70', 1, 2, function() {
      Backbone.history.back(true);
    });
    step('30', -1, 1, cleanup);

    routeBind(steps[0]);
    setTimeout(function() {
      Backbone.history.navigate('search/manhattan/p20', true);
    }, 0);
  });

  asyncTest("Router: navigate with fake replace", 3, function() {
    Backbone.history._fakeReplace = true;
    Backbone.history.navigate('search/q1', true);
    setTimeout(function() {
      equals(router.query, 'q1');
      Backbone.history.navigate('search/q2', true);
      setTimeout(function() {
        equals(router.query, 'q2');
        Backbone.history.navigate('search/q1', {trigger: true, replace: true});
        setTimeout(function() {
          equals(router.query, 'q1');
          Backbone.history._fakeReplace = false;
          start();
        }, 500);
      }, 0);
    }, 0);
  });

  asyncTest("Router: go ignore", 21, function() {
    var hist = Backbone.history;

    // Setup
    step('20', 1, 1, function() {
      hist.navigate('search/manhattan/p30', true);
    });
    step('30', 1, 2, function() {
      hist.navigate('search/manhattan/p40', true);
    });
    step('40', 1, 3, function() {
      hist.back(function(fragment) {
        equals(fragment, 'search/manhattan/p30', 'route returned value');

        setTimeout(function() {
          hist.back(function() { return true; });
        }, 10);
        return false;
      });
    });
    step('20', -1, 1, cleanup);

    routeBind(steps[0]);
    setTimeout(function() {
      hist.navigate('search/manhattan/p20', true);
    }, 0);
  });

  function execStepOut(options, test) {
    var hist = Backbone.history,
        iframe = $('<iframe id="foo-frame" src="data:text/html;base64, PGRpdj4xPC9kaXY+">'),
        form = $('<form action="" method="POST" target="foo-frame"></form>');

    var steps = [
      function() {
        hist.navigate('search/manhattan/p20', true);
      },
      function() {
        hist.navigate('search/manhattan/p30', true);
      },
      function() {
        hist.navigate('search/manhattan/p40', true);
        $('#qunit-fixture').append(iframe);
      }
    ];

    if (options.history) {
      steps.push(
        function() {
          iframe[0].setAttribute('src', 'data:text/html;base64, PGRpdj4yPC9kaXY+');
        },
        function() {
          iframe[0].setAttribute('src', 'data:text/html;base64, PGRpdj4zPC9kaXY+');
        },
        function() {
          iframe[0].setAttribute('src', 'data:text/html;base64, PGRpdj4yPC9kaXY+');
        });
    }

    if (options.emulateFormSubmit) {
      steps.push(function() {
        $('#qunit-fixture').append(form);
      });
      steps.push(function() {
        form.submit();
      });
    }

    steps.push(function() {
      equals(hist.getFragment(), 'search/manhattan/p40');
    });
    steps.push(test);

    steps = _.map(steps, function(step) {
      return function(callback) {
        setTimeout(function() {
          step();
          callback();
        }, 100);
      };
    });

    async.series(steps);
  }

  asyncTest("Router: stepOut", 2, function() {
    var hist = Backbone.history;

    execStepOut(true, function() {
      hist.stepOut({
        view: window,
        callback: function() {
          equals(hist.getFragment(), 'search/manhattan/p30');
          start();
        }
      });
    });
  });
  asyncTest("Router: stepOut - trigger", 3, function() {
    var hist = Backbone.history;

    console.log('why you fail');
    execStepOut({history: true}, function() {
      hist.stepOut({
        view: window,
        trigger: 'search/manhattan/p20',
        routeLimit: 2,
        callback: function(fragment, trigger) {
          equals(fragment, 'search/manhattan/p20');
          equals(trigger, true);
          start();
        }
      });
    });
  });
  asyncTest("Router: stepOut - trigger limit", 3, function() {
    var hist = Backbone.history;

    console.log('but you work');
    execStepOut({history: true}, function() {
      hist.stepOut({
        view: window,
        trigger: 'search/manhattan/p10',
        routeLimit: 2,
        callback: function(fragment, trigger) {
          equals(fragment, 'search/manhattan/p10');
          equals(trigger, false);
          start();
        }
      });
    });
  });

  asyncTest("Router: stepOut - stepLimit", 2, function() {
    // Android 2.x does not insert iframe history into the global history which is helpful
    // for our desired behavior but means that we can't run tests like this.
    var android = navigator.userAgent.match(/Android\s+([\d.]+)/);
    if (android && parseFloat(android[1]) < 4) {
      expect(0);
      return start();
    }

    var hist = Backbone.history;

    execStepOut({history: true}, function() {
      hist.stepOut({
        view: window,
        stepLimit: 2,
        callback: function() {
          equals(hist.getFragment(), 'search/manhattan/p40');
          start();
        }
      });
    });
  });

  asyncTest("Router: stepOut - no iframe", 2, function() {
    var hist = Backbone.history;

    execStepOut({history: false}, function() {
      hist.stepOut({
        view: window,
        callback: function() {
          equals(hist.getFragment(), 'search/manhattan/p30');
          start();
        }
      });
    });
  });

  asyncTest("Router: stepOut - prevent form resubmission", function() {
    var hist = Backbone.history;

    execStepOut({history: false, emulateFormSubmit: true}, function() {
      hist.stepOut({
        view: window,
        callback: function() {
          equals(hist.getFragment(), 'search/manhattan/p30');
          start();
        }
      });
    });
  });
});
