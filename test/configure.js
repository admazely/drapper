
var director = require('../module.js');
var test = require('tap').test;

var Logger = require('bunyan');
var request = require('request');
var http = require('http');

// Create a testable bunyan object
var log = new Logger({ name: 'test', stream: process.stdout });

test("configure method", function (t) {
    t.test("use stream by default", function (t) {
        t.plan(3);

        var pipeContent = 'content string';

        // create a pipe router
        var router = director({
            error: function (err) { throw err; },
            fatal: function (err) { throw err; },
            logger: log
        });

        // veak test for stream
        // In this test the actual behavioure will also be tested, however
        // in future test only the stream property will be used a test.
        t.equal(router.stream, true);

        router.post('/test', function () {
            this.req.pipe(this.res);
        });

        // create server
        var server = http.createServer(router.dispatch.bind(router));
        server.listen(0, '127.0.0.1', function () {
            var href = 'http://127.0.0.1:' + server.address().port + '/test';

            // make request
            request({method: 'POST', uri: href, body: pipeContent}, function (err, res, body) {
                t.equal(err, null);
                t.equal(body, pipeContent);
                server.close(t.end.bind(t));
            });
        });
    });

    t.test("set stream to true in configure", function (t) {
        t.plan(1);

        // create a pipe router
        var router = director({
            error: function (err) { throw err; },
            fatal: function (err) { throw err; },
            logger: log
        });

        // the stream should be set to true
        router.configure({ directorOption: false });
        t.equal(router.stream, true);
    });

    t.test("don't overwrite stream in configure", function (t) {
        t.plan(1);

        // create a pipe router
        var router = director({
            error: function (err) { throw err; },
            fatal: function (err) { throw err; },
            logger: log
        });

        // the stream should be set to false
        router.configure({ stream: false });
        t.equal(router.stream, false);
    });

    t.end();
});
