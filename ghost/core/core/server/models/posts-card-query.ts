import type { Knex } from 'knex';
import { ValidationError } from '@tryghost/errors';

/** Components are URI-encoded before the complete selector is query-encoded. */
function parseSelector(selector: unknown): [string, string] {
  const invalid = () =>
    new ValidationError({
      message: 'Expected has_card=addon:handle:block with URI-encoded identity components.',
      property: 'has_card',
    });
  if (typeof selector !== 'string') {
    throw invalid();
  }
  const parts = selector.split(':');
  if (parts.length !== 3 || parts[0] !== 'addon') {
    throw invalid();
  }
  let handle: string;
  let block: string;
  try {
    handle = decodeURIComponent(parts[1]);
    block = decodeURIComponent(parts[2]);
  } catch {
    throw invalid();
  }
  // Match the existing manifest identity contract, not a new slug grammar.
  if (!handle || !block || block.length > 256) {
    throw invalid();
  }
  return [handle, block];
}

/** Apply before Bookshelf clones the count query so counts and pages agree. */
export function applyCardQuery(qb: Knex.QueryBuilder, selector: unknown): void {
  const [handle, block] = parseSelector(selector);
  // Traverse only Lexical's root/children tree. JSON objects inside props are
  // author data, not editor nodes. EXISTS avoids multiplying posts with cards.
  const document = "CASE WHEN JSON_VALID(posts.lexical) THEN posts.lexical ELSE '{}' END";
  const dialect = qb.client.config.client;
  if (dialect === 'sqlite3' || dialect === 'better-sqlite3') {
    qb.whereRaw(
      `EXISTS (
      WITH RECURSIVE card_nodes(node) AS (
        SELECT CASE WHEN JSON_TYPE(${document}, '$.root') = 'object'
          THEN JSON_EXTRACT(${document}, '$.root') ELSE '{}' END
        WHERE JSON_EXTRACT(${document}, '$.root.type') = 'root'
        UNION ALL
        SELECT child.value FROM card_nodes
        JOIN JSON_EACH(CASE WHEN JSON_TYPE(card_nodes.node, '$.children') = 'array'
          THEN JSON_EXTRACT(card_nodes.node, '$.children') ELSE '[]' END) AS child
        WHERE child.type = 'object'
      )
      SELECT 1 FROM card_nodes
      WHERE JSON_TYPE(node, '$.type') = 'text'
        AND JSON_TYPE(node, '$.addonHandle') = 'text'
        AND JSON_TYPE(node, '$.blockName') = 'text'
        AND JSON_EXTRACT(node, '$.type') = 'addon'
        AND JSON_EXTRACT(node, '$.addonHandle') = ?
        AND JSON_EXTRACT(node, '$.blockName') = ?
    )`,
      [handle, block],
    );
  } else {
    qb.whereRaw(
      `EXISTS (
      WITH RECURSIVE card_nodes(node) AS (
        SELECT JSON_EXTRACT(${document}, '$.root')
        WHERE JSON_UNQUOTE(JSON_EXTRACT(${document}, '$.root.type')) = BINARY 'root'
        UNION ALL
        SELECT child.node FROM card_nodes
        JOIN JSON_TABLE(
          CASE WHEN JSON_TYPE(JSON_EXTRACT(card_nodes.node, '$.children')) = 'ARRAY'
            THEN JSON_EXTRACT(card_nodes.node, '$.children') ELSE JSON_ARRAY() END,
          '$[*]' COLUMNS (node JSON PATH '$')
        ) AS child
        WHERE JSON_TYPE(child.node) = 'OBJECT'
      )
      SELECT 1 FROM card_nodes
      WHERE JSON_TYPE(JSON_EXTRACT(node, '$.type')) = 'STRING'
        AND JSON_TYPE(JSON_EXTRACT(node, '$.addonHandle')) = 'STRING'
        AND JSON_TYPE(JSON_EXTRACT(node, '$.blockName')) = 'STRING'
        AND JSON_UNQUOTE(JSON_EXTRACT(node, '$.type')) = BINARY 'addon'
        AND JSON_UNQUOTE(JSON_EXTRACT(node, '$.addonHandle')) = BINARY ?
        AND JSON_UNQUOTE(JSON_EXTRACT(node, '$.blockName')) = BINARY ?
    )`,
      [handle, block],
    );
  }
}
