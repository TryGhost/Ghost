import type { Frame } from '@tryghost/api-framework';

module.exports = (
  model: {
    toJSON(options: unknown): {
      api_keys?: Array<{ id: string; type: string; secret: string }>;
      [key: string]: unknown;
    };
  },
  frame: Frame,
) => {
  const jsonModel = model.toJSON(frame.options);

  if (jsonModel.api_keys) {
    jsonModel.api_keys.forEach((key) => {
      if (key.type === 'admin') {
        key.secret = `${key.id}:${key.secret}`;
      }
    });
  }

  return jsonModel;
};
