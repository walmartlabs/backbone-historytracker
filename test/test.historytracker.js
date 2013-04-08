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

      // Let the route execute before we verify
      setTimeout(function() {
        callback.apply(undefined, args);
        Backbone.history.unbind('route', handler);
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
      hist.back(function(fragment, route) {
        equals(fragment, 'search/manhattan/p30', 'route returned value');

        setTimeout(function() {
          hist.back(function(route) { return true; });
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
});
