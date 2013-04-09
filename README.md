Overview
--------

[![Build Status](https://secure.travis-ci.org/walmartlabs/backbone-historytracker.png?branch=master)](http://travis-ci.org/walmartlabs/backbone-historytracker)

History-tracker is a backbone plugin that enhances the history management options available in the
core backbone library.

## History Navigation APIs

This also adds support for

* `Backbone.history.back(trigger)`
* `Backbone.history.forward(trigger)`
* `Backbone.history.go(count, trigger)`

Which mirror their associated `window.history` APIs but provide the ability to trigger or not
trigger the route that the change lands on.

`trigger` may be a truthy value to cause the background route to execute or alternatively may be a
callback of the form `trigger(fragment, route)` that should return truthy to trigger a particular
route after the navigation has occurred.

Note that these calls do not prevent one from leaving the SPA context if the user has other pages
before or after the current page in their history.

## Backbone.history.stepOut

Dealing with iframes within a backbone app is problematic as they push on to your history stack and
under most browsers this is not easily removed from the history by removing the iframe.
`Backbone.history.stepOut(options)` provides a utility to work around this shortcoming by stepping
backward until the iframe's history entries are removed in addition to the current backbone route
entry.

Accepts an `options` hash with the following fields:

* `view`: View element hosting the iframe.
    Any iframes hosted in this view will be removed. It is highly recommended that this is
    passed as it will reduce the chance of side effects from the iframe navigation and
    under [some browsers](https://bugzilla.mozilla.org/show_bug.cgi?id=293417) it will make the
    operation significantly faster.
* `complete(fragment, existingTriggered)`: Callback that is called when the operation is complete
* `trigger`: Same options as the trigger parameter above. Additionally may be a string parameter
    which will ensure the final route is the result of the operation.
* `stepLimit` : Maximum number of steps to take.
    This is designed to prevent runaway operations. Defaults to 10
* `routeLimit`: When used in conjunction with a string `trigger` parameter defines the maximum
    number of steps to try to find the trigger parameter before forcing the new trigger route.
    Defaults to 1 and is independent of the `stepLimit` parameter.

## History Location Tracking

When enabled, this feature will associate an incrementing index with every route the user
visits.  This is beneficial, for example, if you are interested in having a different transition
from routes depending on whether the user has clicked the back button or transitioned to a new
route.

With "push state" support
-------------------------
Every time a new route is visited, the URL state will have the unique index associated

No "push state" support
-----------------------
Every time a new route is visited, the route will be re-written to be prefixed with #{index}#.
The `Backbone.History.getFragment` will return the fragment will return the fragment value without
the additional state.

Usage
-----
To turn on the route indexing, use the `trackDirection` property.

    Backbone.history.start({trackDirection: true});
