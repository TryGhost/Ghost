// isNumber function from lodash

var toString = Object.prototype.toString;

function isNumber(value) {
    return typeof value === 'number' ||
      value && typeof value === 'object' && toString.call(value) === '[object Number]' || false;
}

export default isNumber;
