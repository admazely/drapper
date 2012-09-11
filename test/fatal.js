
var drapper = require('../module.js');
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

test("failure handing", function (t) {
    var testArgs = null;
    var testSelf = null;

    // create a pipe router
    var router = drapper({
        error: function (err) {
            throw new Error('failure in error handler');
        },
        fatal: function (err, handleError) {
            testSelf = this;
            testArgs = [err, handleError];
        },
        logger: log
    });

    router.get('/test', function () {
        throw new Error('I throw up');
    });

    // create server
    var server = http.createServer(router.dispatch.bind(router));
    server.listen(0, '127.0.0.1', function () {
        var href = 'http://127.0.0.1:' + server.address().port + '/test';

        request({method: 'GET', uri: href}, function (err) {
            t.equal(err.message, 'socket hang up');

            t.equal(testArgs[0].message, 'I throw up');
            t.equal(testArgs[1].message, 'failure in error handler');
            t.type(testSelf.req, 'object');
            t.type(testSelf.res, 'object');

            // TODO: Should be in server.close but is blocked by
            // - https://github.com/joyent/node/issues/3982
            t.end();
            server.close();
        });
    });
});
