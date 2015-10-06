var slice = Array.prototype.slice;

export default function (/* func, args, thisArg */) {
    var args = slice.call(arguments),
        func = args.shift(),
        thisArg = args.pop();

    function bound() {
        return func.apply(thisArg, args);
    }

    return bound;
}
