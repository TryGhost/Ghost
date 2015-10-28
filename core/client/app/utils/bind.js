const {slice} = Array.prototype;

export default function (/* func, args, thisArg */) {
    let args = slice.call(arguments);
    let func = args.shift();
    let thisArg = args.pop();

    function bound() {
        return func.apply(thisArg, args);
    }

    return bound;
}
