$(document).ready(function() {

  var router = null;
  var lastRoute = null;
  var lastArgs = [];

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

  module("Backbone.Historytracker", {

    setup: function() {
      Backbone.history = null;
      router = new Router({testing: 101});
      Backbone.history.interval = 9;
      Backbone.history.start({pushState: window.testPushState, root: '/foo/', trackDirection: true});
      lastRoute = null;
      lastArgs = [];
      Backbone.history.on('route', onRoute);
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

  asyncTest("Router: index delta", 32, function() {
    var startingIndex = Backbone.history.getIndex();

    function step1(router, name, params) {
      console.log(arguments);
      var hist = Backbone.history;
      equals(hist.getFragment(), 'search/manhattan/p20');
      equals(params.direction, 1);
      equals(hist.getIndex(), startingIndex+1);
      equals(router.query, 'manhattan');
      equals(router.page, '20');

      routeBind(step2);

      setTimeout(function() {
        Backbone.history.navigate('search/manhattan/p30', {replace: true, trigger: true});
      }, 0);
    }
    function step2(router, name, params) {
      var hist = Backbone.history;
      equals(hist.getFragment(), 'search/manhattan/p30');
      equals(params.direction, 0);
      equals(hist.getIndex(), startingIndex+1);
      equals(router.query, 'manhattan');
      equals(router.page, '30');

      routeBind(step3);

      setTimeout(function() {
        Backbone.history.navigate('search/manhattan/p40', true);
      }, 0);
    }
    function step3(router, name, params) {
      var hist = Backbone.history;
      equals(hist.getFragment(), 'search/manhattan/p40');
      equals(params.direction, 1);
      equals(hist.getIndex(), startingIndex+2);
      equals(router.query, 'manhattan');
      equals(router.page, '40');

      routeBind(step4);

      setTimeout(function() {
        Backbone.history.back(true);
      }, 0);
    }
    function step4(router, name, params) {
      var hist = Backbone.history;
      equals(hist.getFragment(), 'search/manhattan/p30');
      equals(params.direction, -1);
      equals(hist.getIndex(), startingIndex+1);
      equals(router.query, 'manhattan');
      equals(router.page, '30');

      routeBind(step5);

      setTimeout(function() {
        Backbone.history.navigate('search/manhattan/p50', true);
      }, 0);
    }
    function step5(router, name, params) {
      var hist = Backbone.history;
      equals(hist.getFragment(), 'search/manhattan/p50');
      equals(params.direction, 1);
      equals(hist.getIndex(), startingIndex+2);

      routeBind(step6);

      setTimeout(function() {
        Backbone.history.navigate('search/manhattan/p60', true);
      }, 0);
    }
    function step6(router, name, params) {
      var hist = Backbone.history;
      equals(hist.getFragment(), 'search/manhattan/p60');
      equals(params.direction, 1);
      equals(hist.getIndex(), startingIndex+3);

      routeBind(step7);

      setTimeout(function() {
        // Backbone.history.go(-2, false);
        Backbone.history.navigate('search/manhattan/p70', true);
      }, 0);
    }

    function step7(router, name, params) {
      var hist = Backbone.history;
      equals(hist.getFragment(), 'search/manhattan/p70');
      equals(params.direction, 1);
      equals(hist.getIndex(), startingIndex+2);

      routeBind(step8);

      setTimeout(function() {
        Backbone.history.back(true);
      }, 0);
    }

    function step8(router, name, params) {
      var hist = Backbone.history;
      equals(hist.getFragment(), 'search/manhattan/p30');
      equals(params.direction, -1);
      equals(hist.getIndex(), startingIndex+1);

      setTimeout(cleanup, 0);
    }

    function cleanup() {
      if (window.testPushState) {
        window.history.pushState({}, document.title, originalUrl);
      } else {
        window.location.hash = '';
      }
      start();
    }

    routeBind(step1);
    setTimeout(function() {
      Backbone.history.navigate('search/manhattan/p20', true);
    }, 0);
  });
});
