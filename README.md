Overview
--------

[![Build Status](https://secure.travis-ci.org/walmartlabs/backbone-historytracker.png?branch=master)](http://travis-ci.org/walmartlabs/backbone-historytracker)

History-tracker is a backbone plugin will associate an incrementing index with every route the user visits.  This is beneficial, for example, if you are interested in having a different transition from routes depending on whether the user has clicked the back button or transitioned to a new route.

With "push state" support
-------------------------
Every time a new route is visited, the URL state will have the unique index associated

No "push state" support
-----------------------
Every time a new route is visited, the route will be re-written to be prefixed with #{index}#.  The Backbone.History.getFragment will return the fragment will return the fragment value without the additional state.

Usage
-----
To turn on the route indexing, use the 'trackDirection' property.  'Backbone.history.start({trackDirection: true});'

*You must use the [Walmart Labs fork of backbone](https://github.com/walmartlabs/backbone)*.  This fork has been modified a small amount to provide better
support to external plugins.