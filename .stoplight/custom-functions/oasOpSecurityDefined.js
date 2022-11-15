import { isPlainObject } from '@stoplight/json';
import { createRulesetFunction } from '@stoplight/spectral-core';

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

function _get(value, path) {
  for (const segment of path) {
    if (!isObject(value)) {
      break;
    }

    value = value[segment];
  }

  return value;
}

export default createRulesetFunction(
  {
    input: {
      type: 'object',
      properties: {
        paths: {
          type: 'object',
        },
        security: {
          type: 'array',
        },
      },
    },
    options: {
      type: 'object',
      properties: {
        schemesPath: {
          type: 'array',
          items: {
            type: ['string', 'number'],
          },
        },
      },
    },
  },
  function oasOpSecurityDefined(targetVal, { schemesPath }) {
    const { paths } = targetVal;

    const results = [];

    const schemes = _get(targetVal, schemesPath);
    const allDefs = isObject(schemes) ? Object.keys(schemes) : [];

    // Check global security requirements

    const { security } = targetVal;

    if (Array.isArray(security)) {
      for (const [index, value] of security.entries()) {
        if (!isObject(value)) {
          continue;
        }

        const securityKeys = Object.keys(value);

        for (const securityKey of securityKeys) {
          if (!allDefs.includes(securityKey)) {
            results.push({
              message: `API "security" values must match a scheme defined in the "${schemesPath.join('.')}" object.`,
              path: ['security', index, securityKey],
            });
          }
        }
      }
    }

    for (const { path, operation, value } of getAllOperations(paths)) {
      if (!isObject(value)) continue;

      const { security } = value;

      if (!Array.isArray(security)) {
        continue;
      }

      for (const [index, value] of security.entries()) {
        if (!isObject(value)) {
          continue;
        }

        const securityKeys = Object.keys(value);

        for (const securityKey of securityKeys) {
          if (!allDefs.includes(securityKey)) {
            results.push({
              message: `Operation "security" values must match a scheme defined in the "${schemesPath.join(
                '.',
              )}" object.`,
              path: ['paths', path, operation, 'security', index, securityKey],
            });
          }
        }
      }
    }

    return results;
  },
);
