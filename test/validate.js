
var director = require('../module.js');
var test = require('tap').test;

var Logger = require('bunyan');

// Create a testable bunyan object
var log = new Logger({ name: 'test', stream: process.stdout });

test("config validation", function (t) {
    t.test("no config object", function (t) {
        t.plan(1);

        try {
            director();
        } catch (e) {
            t.equal(e.message, 'first argument must be an object');
            t.end();
        }
    });

    t.test("no bunyan logger", function (t) {
        t.plan(1);

        try {
            director({
                'error': function () {},
                'fatal': function () {}
            });
        } catch (e) {
            t.equal(e.message, 'a bunyan logger must be specified');
        }
    });

    t.test("no error handler", function (t) {
        t.plan(1);

        try {
            director({
                'fatal': function () {},
                'logger': log
            });
        } catch (e) {
            t.equal(e.message, 'an error handler must be specified');
        }
    });

    t.test("no fatal handler", function (t) {
        t.plan(1);

        try {
            director({
                'error': function () {},
                'logger': log
            });
        } catch (e) {
            t.equal(e.message, 'a fatal handler must be specified');
        }
    });

    t.end();
});
