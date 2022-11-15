// This function will check an API doc to verify that any tag that appears on
// an operation is also present in the global tags array.
import { isPlainObject } from '@stoplight/json';

function isObject(value) {
  return value !== null && typeof value === 'object';
}

const validOperationKeys = ['get', 'head', 'post', 'put', 'patch', 'delete', 'options', 'trace'];

function* getAllOperations(paths) {
  if (!isPlainObject(paths)) {
    return;
  }

  const item = {
    path: '',
    operation: '',
    value: null,
  };

  for (const path of Object.keys(paths)) {
    const operations = paths[path];
    if (!isPlainObject(operations)) {
      continue;
    }

    item.path = path;

    for (const operation of Object.keys(operations)) {
      if (!isPlainObject(operations[operation]) || !validOperationKeys.includes(operation)) {
        continue;
      }

      item.operation = operation;
      item.value = operations[operation];

      yield item;
    }
  }
}

export const oasTagDefined = targetVal => {
  if (!isObject(targetVal)) return;
  const results = [];

  const globalTags = [];

  if (Array.isArray(targetVal.tags)) {
    for (const tag of targetVal.tags) {
      if (isObject(tag) && typeof tag.name === 'string') {
        globalTags.push(tag.name);
      }
    }
  }

  const { paths } = targetVal;

  for (const { path, operation, value } of getAllOperations(paths)) {
    if (!isObject(value)) continue;

    const { tags } = value;

    if (!Array.isArray(tags)) {
      continue;
    }

    for (const [i, tag] of tags.entries()) {
      if (!globalTags.includes(tag)) {
        results.push({
          message: 'Operation tags must be defined in global tags.',
          path: ['paths', path, operation, 'tags', i],
        });
      }
    }
  }

  return results;
};

export default oasTagDefined;
