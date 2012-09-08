
var director = require('../module.js');
var test = require('tap').test;

var Logger = require('bunyan');
var request = require('request');
var async = require('async');
var flower = require('flower');
var http = require('http');
var fs = require('fs');

// Create a testable bunyan object
var logStream = flower.relayReadStream();
var log = new Logger({
    name: 'test',
    stream: logStream,
    serializers: {
        req: Logger.stdSerializers.req,
        err: Logger.stdSerializers.err,
        res: Logger.stdSerializers.res
    }
});

test("error handling", function (t) {

    t.test('should add a .error function', function (t) {
        t.plan(7);

        // create a pipe router
        var router = director({
            error: function (err) {
                this.res.statusCode = err.statusCode;
                this.res.end(JSON.stringify({error: err.message}));

                this.log.error({err: err});
            },
            fatal: function (err) { throw err; },
            logger: log
        });

        router.get('/test', function () {
            return this.error(401, new Error('error level message'));
        });

        // create server
        var server = http.createServer(router.dispatch.bind(router));
        server.listen(0, '127.0.0.1', function () {
            var href = 'http://127.0.0.1:' + server.address().port + '/test';

            async.parallel({
                // make request
                request: function (callback) {
                    request({method: 'GET', uri: href}, function (err, req) {
                        callback(err, req);
                    });
                },

                // track logger
                log: function (callback) {
                    logStream.once('data', function (chunk) {
                        callback(null, JSON.parse(chunk));
                    });
                }
            }, function (err, results) {
                t.equal(err, null);

                var req = results.request, log = results.log;

                // check statusCode
                t.equal(req.statusCode, 401);
                t.equal(req.body, '{"error":"error level message"}');

                // check that something was logged
                t.type(log.req_id, 'string');
                t.equal(log.level, 50);
                t.equal(log.err.message, 'error level message');
                t.equal(log.err.statusCode, 401);

                server.close(t.end.bind(t));
            });
        });
    });

    t.test('should return a 404 page if not found', function (t) {
        t.plan(7);

        // create a pipe router
        var router = director({
            error: function (err) {
                this.res.statusCode = err.statusCode;
                this.res.end(JSON.stringify({error: err.message}));

                this.log.error({err: err});
            },
            fatal: function (err) { throw err; },
            logger: log
        });

        // create server
        var server = http.createServer(router.dispatch.bind(router));
        server.listen(0, '127.0.0.1', function () {
            var href = 'http://127.0.0.1:' + server.address().port + '/test';

            async.parallel({
                // make request
                request: function (callback) {
                    request({method: 'GET', uri: href}, function (err, req) {
                        callback(err, req);
                    });
                },

                // track logger
                log: function (callback) {
                    logStream.once('data', function (chunk) {
                        callback(null, JSON.parse(chunk));
                    });
                }
            }, function (err, results) {
                t.equal(err, null);

                var req = results.request, log = results.log;

                // check statusCode
                t.equal(req.statusCode, 404);
                t.equal(req.body, '{"error":"Could not find path: /test"}');

                // check that something was logged
                t.type(log.req_id, 'string');
                t.equal(log.level, 50);
                t.equal(log.err.message, 'Could not find path: /test');
                t.equal(log.err.statusCode, 404);

                server.close(t.end.bind(t));
            });
        });
    });

    t.test('should catch errors outside event loop', function (t) {
        t.plan(7);

        // create a pipe router
        var router = director({
            error: function (err) {
                this.res.statusCode = err.statusCode;
                this.res.end(JSON.stringify({error: err.message}));

                this.log.error({err: err});
            },
            fatal: function (err) { throw err; },
            logger: log
        });

        router.get('/test', function () {
            fs.readFile(__filename, function () {
                throw new Error('I throw up');
            });
        });

        // create server
        var server = http.createServer(router.dispatch.bind(router));
        server.listen(0, '127.0.0.1', function () {
            var href = 'http://127.0.0.1:' + server.address().port + '/test';

            async.parallel({
                // make request
                request: function (callback) {
                    request({method: 'GET', uri: href}, function (err, req) {
                        callback(err, req);
                    });
                },

                // track logger
                log: function (callback) {
                    logStream.once('data', function (chunk) {
                        callback(null, JSON.parse(chunk));
                    });
                }
            }, function (err, results) {
                t.equal(err, null);

                var req = results.request, log = results.log;

                // check statusCode
                t.equal(req.statusCode, 500);
                t.equal(req.body, '{"error":"I throw up"}');

                // check that something was logged
                t.type(log.req_id, 'string');
                t.equal(log.level, 50);
                t.equal(log.err.message, 'I throw up');
                t.equal(log.err.statusCode, 500);

                server.close(t.end.bind(t));
            });
        });
    });


    t.test('should catch errors inside event loop', function (t) {
        t.plan(7);

        // create a pipe router
        var router = director({
            error: function (err) {
                this.res.statusCode = err.statusCode;
                this.res.end(JSON.stringify({error: err.message}));

                this.log.error({err: err});
            },
            fatal: function (err) { throw err; },
            logger: log
        });

        router.get('/test', function () {
            throw new Error('I throw up');
        });

        // create server
        var server = http.createServer(router.dispatch.bind(router));
        server.listen(0, '127.0.0.1', function () {
            var href = 'http://127.0.0.1:' + server.address().port + '/test';

            async.parallel({
                // make request
                request: function (callback) {
                    request({method: 'GET', uri: href}, function (err, req) {
                        callback(err, req);
                    });
                },

                // track logger
                log: function (callback) {
                    logStream.once('data', function (chunk) {
                        callback(null, JSON.parse(chunk));
                    });
                }
            }, function (err, results) {
                t.equal(err, null);

                var req = results.request, log = results.log;

                // check statusCode
                t.equal(req.statusCode, 500);
                t.equal(req.body, '{"error":"I throw up"}');

                // check that something was logged
                t.type(log.req_id, 'string');
                t.equal(log.level, 50);
                t.equal(log.err.message, 'I throw up');
                t.equal(log.err.statusCode, 500);

                server.close(t.end.bind(t));
            });
        });
    });

    t.end();
});