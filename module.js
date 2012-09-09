
var util = require('util');
var domain = require('domain');
var uuid = require('node-uuid');

var directorRouter = require('director').http.Router;

function cleanUpError(err) {
    // this is just a lot of data that domain use internally
    // but bunyan shouldn't care about it and some of them
    // can't be stringified
    delete err.domain;
    delete err.domain_emitter;
    delete err.domain_thrown;

    return err;
}

function Router(config) {
    if (!(this instanceof Router)) return new Router(config);
    directorRouter.call(this);

    // check config object
    if (!config) throw new TypeError('first argument must be an object');
    if (!config.logger) throw new TypeError('a bunyan logger must be specified');
    if (!config.error) throw new TypeError('an error handler must be specified');
    if (!config.fatal) throw new TypeError('a fatal handler must be specified');

    // request/response spefic logic
    this.attach(function () {
        var self = this;

        // get or generate a request UUID
        var requestId = this.req.headers['X-Request-Id'] || uuid.v1();
        this.res.setHeader('X-Request-Id', requestId);

        // setup bunyan logger
        this.log = config.logger.child({
            'req_id': requestId,
            'req': this.req,
            'res': this.res
        });

        // this attach functions are executed syncronously, the active domain
        // should be the domain relevant to this request/response
        this.domain = domain.active;
        this.domain.on('error', function (err) {
            var errorDomain = domain.create();

            errorDomain.once('error', function (handleError) {
                handleError = cleanUpError(handleError);

                // no more protection, do something fail safe PLEASE!
                config.fatal.call(self, err, handleError);

                // stops all I/O related to this request/response
                errorDomain.dispose();
                self.domain.dispose();
            });

            errorDomain.run(function () {
                // Since a domain error event is in a uncaughtException handler
                // scope, a sync error won't catched by domain. Thats we a try
                // catch is nessarry here.
                try {
                    // stops all I/O related to this request/response
                    self.res.once('close', function () {
                        self.domain.dispose();
                    });

                    // remove domain specific properties from the error object
                    err = cleanUpError(err);

                    // if no statusCode was assigned to the error, use 500
                    err.statusCode = err.statusCode || 500;

                    config.error.call(self, err);
                } catch (e) {
                    process.emit('uncaughtException', e);
                }
            });
        });

        //
        // as much as possibol should be below ths line,
        // otherwise if an error throws, there will be no domain.on('error')
        // handler to catch it.
        //

        // simple error helper
        this.error = function (statusCode, err) {
            // statusCode is optional
            if (statusCode instanceof Error) {
                err = statusCode;
            } else {
                err.statusCode = statusCode;
            }

            self.domain.emit('error', err);
        };
    });
}
util.inherits(Router, directorRouter);
module.exports = Router;

Router.prototype.configure = function (options) {
    options = options || {};

    // use streams by default
    if (options.hasOwnProperty('stream') === false) {
        options.stream = true;
    }

    // apply configure object
    return directorRouter.prototype.configure.call(this, options);
};

Router.prototype.dispatch = function (req, res, callback) {
    var self = this, args = arguments;

    // create request/response domain
    var d = domain.create();

    // catch request and response errors and dispose them in case of error
    d.add(req);
    d.add(res);

    // run router in current domain
    return d.run(function () {
        return directorRouter.prototype.dispatch.call(self, req, res, function (errInfo) {
            // relay errors to the domain
            if (errInfo) {
                var err = new Error(errInfo.message);
                    err.statusCode = errInfo.status;

                d.emit('error', err);
            }

            // relay callback info
            if (callback) callback.apply(this, arguments);
        });
    });
};
