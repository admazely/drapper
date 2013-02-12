
var drapper = require('../module.js');
var test = require('tap').test;

var Logger = require('bunyan');
var request = require('request');
var http = require('http');

// Create a testable bunyan object
var log = new Logger({ name: 'test', stream: process.stdout });

test("custom default headers", function (t) {
    t.test("don't cache ajax-calls with GET", function(t) {
        t.plan(4);

        var router = drapper({
            error: function (err) { throw err; },
            fatal: function (err) { throw err; },
            logger: log
        });

        // setup dummy route
        router.get('/', function() {
            this.res.end('Hello, world!');
        });

        // create server
        var server = http.createServer(router.dispatch.bind(router));
        t.once('end', server.close.bind(server));

        server.listen(0, '127.0.0.1', function() {
            var href = 'http://127.0.0.1:' + server.address().port + '/';

            // make ajax-request that's not ajax
            request({uri: href}, function(err, res) {
                t.equal(err, null);
                t.notEqual(res.headers['expires'], '-1');
            });

            // make ajax-request
            request({
                uri: href,
                headers: {'X-Requested-With': 'XMLHttpRequest'}
            }, function(err, res) {
                t.equal(err, null);
                t.equal(res.headers['expires'], '-1');
            });
        });
    });

    t.end();
});