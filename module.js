
var util = require('util');
var domain = require('domain');
var hash = require('hashish');
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

function Router() {
    directorRouter.call(this);
    this.configure();

    // lets avoid overwriteing any properties used by director
    var config = this.customConfig = {};

    // request/response spefic logic
    this.attach(function () {
        var self = this;

        // get or generate a request UUID
        var requestId = this.req.headers['X-Request-Id'] || uuid.v1();
        this.res.addHeader('X-Request-Id', requestId);

        // setup bunyan logger
        this.log = config.log.child({
            'req_id': requestId
        });

        // this attach functions are executed syncronously, the active domain
        // should be the domain relevant to this request/response
        this.domain = domain.active;
        this.domain.on('error', function (err) {
            var requestDisposed = false;
            var handlerDisposed = false;

            // since error handing isn't always sync,
            // a domain will be created for the error handing itself
            var d = domain.create();
            d.run(function () {
                // stops all I/O related to this request/response
                if (!requestDisposed) {
                    self.domain.dispose();
                    requestDisposed = true;
                }

                // remove domain specific properties from the error object
                err = cleanUpError(err);

                // if no statusCode was assigned to the error, use 500
                err.statusCode = err.statusCode || 500;

                config.error.call(self, err);
            });

            // there will only be none or one error, since the domain
            // is disposed immediately
            d.once('error', function (handleError) {
                // you really messed up, dispose everything
                if (!handlerDisposed) {
                    d.dispose();
                    handlerDisposed = true;
                }
                if (!requestDisposed) {
                    requestDisposed = true;
                    self.domain.dispose();
                }

                // no more protection, do something fail safe PLEASE!
                config.fatal.call(self, err, handleError);
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

Router.prototype.configure = function (options) {
    if (typeof options !== 'object' || options === null) {
        throw new Error('configure do only understand objects');
    }

    if (!options.logger) throw new Error('a bunyan logger must be specified');
    if (!options.error) throw new Error('an error handler must be specified');
    if (!options.fatal) throw new Error('a fatal handler must be specified');

    // use streams by default
    if (options.hasOwnProperty('stream') === false) {
        options.stream = true;
    }

    // store none director settings
    this.customConfig.logger = options.logger;
    this.customConfig.error = options.error;
    this.customConfig.fatal = options.fatal;

    // apply configure object
    options = hash.copy(options);
    delete options.logger;
    delete options.error;
    delete options.fatal;
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
        return directorRouter.prototype.configure.call(self, args, function (errInfo) {
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
