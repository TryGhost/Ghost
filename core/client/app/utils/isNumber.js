// isNumber function from lodash

const {toString} = Object.prototype;

export default function (value) {
    return typeof value === 'number' ||
      value && typeof value === 'object' && toString.call(value) === '[object Number]' || false;
}
