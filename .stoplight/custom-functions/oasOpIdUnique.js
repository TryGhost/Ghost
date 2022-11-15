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

export const oasOpIdUnique = targetVal => {
  if (!isObject(targetVal) || !isObject(targetVal.paths)) return;

  const results = [];

  const { paths } = targetVal;

  const seenIds = [];

  for (const { path, operation } of getAllOperations(paths)) {
    const pathValue = paths[path];

    if (!isObject(pathValue)) continue;

    const operationValue = pathValue[operation];

    if (!isObject(operationValue) || !('operationId' in operationValue)) {
      continue;
    }

    const { operationId } = operationValue;

    if (seenIds.includes(operationId)) {
      results.push({
        message: 'operationId must be unique.',
        path: ['paths', path, operation, 'operationId'],
      });
    } else {
      seenIds.push(operationId);
    }
  }

  return results;
};

export default oasOpIdUnique;
