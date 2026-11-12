module.exports = (
  model: {
    toJSON(options: unknown): {
      api_keys?: Array<{ id: string; type: string; secret: string }>;
      [key: string]: unknown;
    };
  },
  frame: { options?: unknown },
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
