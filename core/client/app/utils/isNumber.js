// isNumber function from lodash

var toString = Object.prototype.toString;

export default function (value) {
    return typeof value === 'number' ||
      value && typeof value === 'object' && toString.call(value) === '[object Number]' || false;
}
