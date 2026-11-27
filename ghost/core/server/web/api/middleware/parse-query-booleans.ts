import type { NextFunction, Request, Response } from 'express';

// Query keys can shadow `constructor`, so check the prototype instead
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function parseValue(value: unknown): unknown {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.map(parseValue);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, parseValue(item)]));
  }
  return value;
}

/**
 * Converts `'true'` and `'false'` query values to booleans, including inside
 * nested objects and arrays, e.g. `?filter=x&include=true` -> `{include: true}`
 */
export function parseQueryBooleans(req: Request, res: Response, next: NextFunction) {
  req.query = parseValue(req.query) as Request['query'];
  next();
}
