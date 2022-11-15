import { createRulesetFunction } from '@stoplight/spectral-core';
import { oas3 } from '@stoplight/spectral-formats';

export const oasOpSuccessResponse = createRulesetFunction(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  (input, opts, context) => {
    const isOAS3X = context.document.formats?.has(oas3) === true;

    for (const response of Object.keys(input)) {
      if (isOAS3X && (response === '2XX' || response === '3XX')) {
        return;
      }

      if (Number(response) >= 200 && Number(response) < 400) {
        return;
      }
    }

    return [
      {
        message: 'Operation must define at least a single 2xx or 3xx response',
      },
    ];
  },
);

export default oasOpSuccessResponse;
