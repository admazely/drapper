#drapper

The HTTP part of [director](https://github.com/flatiron/director) with some
extra feature build in.

## Features

* bunyan logging
* request tracking
* domain integration
* use streams by default

## Installation

```sheel
npm install drapper
```

## Example

```JavaScript
var drapper = require('drapper');
var Logger = require('bunyan');

var router = drapper({
    error: funcion (err) {
        // once the close event emits, all I/O will be canceled
        this.res.statusCode = err.statusCode;
        this.res.end(err.message);

        this.log.error({err: err});
    },

    fatal: function (err, handleError) {
        // the error handler failed,
        // lets do something fail-safe (do that exist?)
        console.error(handleError.stack);
        console.error(err.stack);
    },

    logger: new Logger({ name: 'server', stream: process.stdout })
});

// standart director route
router.get('/hi', function () {
    var self = this;

    fs.readFile('hi.txt', function (err, content) {
        // this module adds an extra error method
        if (err) return self.error(500, err);

        self.res.end(content);
    });
});

// the router object is binded to a HTTP server the usual way
http.createServer(router.dispatch.bind(router)).listen(8000);
```

## API documentation

The API is almost identical to the [director](https://github.com/flatiron/director)
module, but with the following exceptions.

### router = drapper(settings)

The constructor function is the only function exposed by the `drapper`
module. Its equal to the `director.http.Router` constructor but takes a not
optional `settings` object with the following properties:

#### settings.error

In case of an error (not found is registred as an error too) this handler
will be executed with an `Error` object.

Any `Error` object contains a `statusCode` property, there is automaticly set
or manually speficed.

#### settings.fatal

When the `error` handler fail this handler will work as a fallback.
The handler is executed with two arguments, the first is the same as in the
`error` handler, the second is the `Error` there prevented `error` from
completing.

#### settings.logger

A `bunyan` logger object, on each new request a child logger object
will be created with `req`, `res` and a `req_id` properties attached to it.

### Router methods

In [director](https://github.com/flatiron/director) the `this` object in a route
handler contains a `req` and `res` object. When using this module that object
is extend with the following properties.

#### this.error([statusCode], error)

Will execute the `error` handler with the given `error` object.

If `statusCode` was given, its value will be attached to the `error` object,
by setting a `statusCode` property on it. If `statusCode` wasn't given the
`statusCode` property will default to `500`.

#### this.domain

The [domain](http://nodejs.org/api/domain.html) object attached to the current
`request` and response `object`.

#### this.log

A bunyan logger child with the the following properties set:

* `req`: the HTTP request object
* `res`: the HTTP response object
* `req_id`: an ID unique to a series of request. If a `X-Request-Id` header
  was a part of the `request` object its value will be the value of `req_id`,
  otherwise `req_id` will be a randomly generated UUID.

Note that a `X-Request-Id` header will also be set on the `response` object. That
way a series of request can be indentified in the bunyan log stream.
