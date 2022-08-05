import capitalize from 'lodash/capitalize';
import camelCase from 'lodash/camelCase';

export default function arrayToMap(array) {
    let map = Object.create(null);
    array.forEach((key) => {
        if (key) { // skip undefined/falsy key values
            key = `is${capitalize(camelCase(key))}`;
            map[key] = true;
        }
    });
    return map;
}
