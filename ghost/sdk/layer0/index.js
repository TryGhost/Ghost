/* globals window */
module.exports = function layer0(frame) {
    var getuid = (function (i) {
        return function () {
            return i += 1;
        };
    })(1);
    var origin = new URL(frame.getAttribute('src')).origin;
    var handlers = {};
    var listener = function () {};

    window.addEventListener('message', function (event) {
        if (event.origin !== origin) {
            return;
        }
        if (!event.data || !event.data.uid) {
            if (event.data.event) {
                return listener(event.data);
            }
            return;
        }
        var handler = handlers[event.data.uid];
        if (!handler) {
            return;
        }
        delete handlers[event.data.uid];
        handler(event.data.error, event.data.data);
    });

    function call(method, options, cb) {
        var uid = getuid();
        var data = {uid, method, options};
        handlers[uid] = cb;
        frame.contentWindow.postMessage(data, origin);
    }

    function listen(fn) {
        listener = fn;
    }

    return {call, listen};
};
