
var drapper = require('../module.js');
var test = require('tap').test;

var Logger = require('bunyan');
var request = require('request');
var flower = require('flower');
var async = require('async');
var http = require('http');

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

test("logging features", function (t) {
    t.test(".log property object", function (t) {
        t.plan(8);

        // create a pipe router
        var router = drapper({
            error: function (err) { throw err; },
            fatal: function (err) { throw err; },
            logger: log
        });

        router.get('/test', function () {
            this.log.info({'say': 'hi'});
            this.res.end('hi');
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
                t.equal(req.statusCode, 200);
                t.equal(req.body, 'hi');

                // check that something was logged
                t.type(log.req_id, 'string');
                t.equal(log.level, 30);
                t.equal(log.say, 'hi');
                t.equal(log.req.url, '/test');
                t.equal(log.res.statusCode, 200);

                server.close(t.end.bind(t));
            });
        });
    });

    t.test("request id header", function (t) {
        t.plan(5);

        // create a pipe router
        var router = drapper({
            error: function (err) { throw err; },
            fatal: function (err) { throw err; },
            logger: log
        });

        router.get('/test', function () {
            this.log.info({'say': 'hi'});
            this.res.end('hi');
        });

        // create server
        var server = http.createServer(router.dispatch.bind(router));
        server.listen(0, '127.0.0.1', function () {
            var href = 'http://127.0.0.1:' + server.address().port + '/test';

            request({method: 'GET', uri: href}, function (err, res) {
                t.equal(err, null);

                var id = res.headers['X-Request-Id'];

                request({
                    method: 'GET',
                    uri: href,
                    headers: { 'X-Request-Id': id }
                }, function (err, res) {
                    t.equal(err, null);

                    // check statusCode
                    t.equal(res.statusCode, 200);
                    t.equal(res.body, 'hi');
                    t.equal(res.headers['X-Request-Id'], id);

                    server.close(t.end.bind(t));
                });
            });
        });
    });

    t.end();
});
