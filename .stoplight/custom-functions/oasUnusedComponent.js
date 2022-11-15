import { unreferencedReusableObject } from '@stoplight/spectral-functions';
import { createRulesetFunction } from '@stoplight/spectral-core';

function isObject(value) {
  return value !== null && typeof value === 'object';
}

export default createRulesetFunction(
  {
    input: {
      type: 'object',
      properties: {
        components: {
          type: 'object',
        },
      },
      required: ['components'],
    },
    options: null,
  },
  function oasUnusedComponent(targetVal, opts, context) {
    const results = [];
    const componentTypes = [
      'schemas',
      'responses',
      'parameters',
      'examples',
      'requestBodies',
      'headers',
      'links',
      'callbacks',
    ];

    for (const type of componentTypes) {
      const value = targetVal.components[type];
      if (!isObject(value)) continue;

      const resultsForType = unreferencedReusableObject(
        value,
        { reusableObjectsLocation: `#/components/${type}` },
        context,
      );
      if (resultsForType !== void 0 && Array.isArray(resultsForType)) {
        results.push(...resultsForType);
      }
    }

    return results;
  },
);
