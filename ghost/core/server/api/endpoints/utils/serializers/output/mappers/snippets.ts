import type { Frame } from '@tryghost/api-framework';

module.exports = (
  snippet: {
    toJSON(options: unknown): {
      id: string;
      name?: string;
      mobiledoc?: string;
      lexical?: string;
      created_at: string;
      updated_at: string;
    };
  },
  frame: Frame,
) => {
  const json = snippet.toJSON(frame.options);

  return {
    id: json.id,
    name: json.name,
    mobiledoc: json.mobiledoc,
    lexical: json.lexical,
    created_at: json.created_at,
    updated_at: json.updated_at,
  };
};
