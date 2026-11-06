import fs from 'node:fs';
import path from 'node:path';
import _ from 'lodash';
import { z } from 'zod';
import { configSchema } from './schema';

type JsonSchema = z.core.JSONSchema.JSONSchema;

type Tree = Record<string, unknown>;

const configDir = __dirname;

function readJson(...parts: string[]): Tree {
  return JSON.parse(fs.readFileSync(path.join(configDir, ...parts), 'utf8'));
}

/** The config file input Ghost validates, before the loader's own transforms. */
export function buildJsonSchema(): JsonSchema {
  return z.toJSONSchema(configSchema, { io: 'input', unrepresentable: 'any' });
}

/** A node's properties, minus any bare `true`/`false` schemas, which have nothing to document. */
function props(node: JsonSchema | undefined): Record<string, JsonSchema> {
  return _.pickBy(node?.properties, (child): child is JsonSchema => typeof child === 'object');
}

/** Top-level keys Ghost ships a value for that the schema doesn't describe yet. */
export function findUncoveredKeys(): string[] {
  const shipped = new Set([
    ...Object.keys(readJson('defaults.json')),
    ...Object.keys(readJson('overrides.json')),
  ]);
  const covered = new Set(Object.keys(configSchema.shape));

  return [...shipped].filter((key) => !covered.has(key)).sort();
}

function inline(value: unknown): string {
  return `\`${JSON.stringify(value)}\``;
}

function renderValue(value: unknown): string {
  const json = JSON.stringify(value);
  if (json.length <= 60) {
    return inline(value);
  }
  return `\n\n  \`\`\`json\n${JSON.stringify(value, null, 2).replace(/^/gm, '  ')}\n  \`\`\``;
}

function renderType(node: JsonSchema): string {
  if (node.const !== undefined) {
    return inline(node.const);
  }
  if (node.enum) {
    return node.enum.map(inline).join(' \\| ');
  }
  const variants = node.oneOf ?? node.anyOf;
  if (variants) {
    return [...new Set(variants.map(renderType))].join(' \\| ');
  }
  if (node.type === 'array') {
    const item = node.items;
    return typeof item === 'object' && !Array.isArray(item)
      ? `array of ${renderType(item)}`
      : 'array';
  }
  if (Array.isArray(node.type)) {
    return node.type.join(' \\| ');
  }
  return node.type ?? 'any';
}

function hasChildren(node: JsonSchema): boolean {
  return node.type === 'object' && Object.keys(props(node)).length > 0;
}

/** The values a discriminator accepts: a `const`, or an enum of aliases. */
function pinned(node: JsonSchema | undefined): unknown[] | undefined {
  if (node?.const !== undefined) {
    return [node.const];
  }
  return node?.enum;
}

/** The property every object variant pins to fixed values, e.g. `database.client`. */
function findDiscriminator(variants: JsonSchema[]): string | undefined {
  if (!variants.every(hasChildren)) {
    return undefined;
  }
  return Object.keys(props(variants[0])).find((key) =>
    variants.every((variant) => pinned(props(variant)[key]) !== undefined),
  );
}

class ReferenceWriter {
  private readonly lines: string[] = [];
  private readonly defaults: Tree;
  private readonly fixed: Tree;

  constructor(defaults: Tree, fixed: Tree) {
    this.defaults = defaults;
    this.fixed = fixed;
  }

  toString(): string {
    return `${this.lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()}\n`;
  }

  line(text = ''): void {
    this.lines.push(text);
  }

  /** Every key under `node`, skipping internal ones and those overrides.json pins. */
  private visible(node: JsonSchema, keyPath: string[]): Array<[string, JsonSchema]> {
    return Object.entries(props(node)).filter(([key, child]) => {
      const childPath = [...keyPath, key];
      return child.internal !== true && !this.isFixed(child, childPath);
    });
  }

  /** A key is fixed when overrides.json supplies it, or every key beneath it. */
  private isFixed(node: JsonSchema, keyPath: string[]): boolean {
    if (hasChildren(node)) {
      return Object.entries(props(node)).every(([key, child]) =>
        this.isFixed(child, [...keyPath, key]),
      );
    }
    return _.has(this.fixed, keyPath);
  }

  section(key: string, node: JsonSchema): void {
    if (node.internal === true || this.isFixed(node, [key])) {
      return;
    }
    this.line(`## \`${key}\``);
    this.line();
    this.renderNode(node, [key], true, '###');
  }

  private renderNode(
    node: JsonSchema,
    keyPath: string[],
    isRequired: boolean,
    heading: string,
  ): void {
    const variants = node.oneOf ?? node.anyOf;
    const discriminator = variants && findDiscriminator(variants);

    if (variants && discriminator) {
      this.renderUnion(node, variants, discriminator, keyPath, heading);
    } else if (hasChildren(node)) {
      this.renderObject(node, keyPath, heading);
    } else {
      this.renderLeaf(node, keyPath, isRequired);
    }
  }

  private renderObject(
    node: JsonSchema,
    keyPath: string[],
    heading: string,
    skip: string[] = [],
  ): void {
    if (node.description) {
      this.line(node.description);
      this.line();
    }
    if (keyPath.length > 1 && node.additionalProperties) {
      this.line('Keys not listed here are passed through unchanged.');
      this.line();
    }
    if (node.examples?.length) {
      this.line(`Example: ${renderValue(node.examples[0])}`);
      this.line();
    }
    this.renderChildren(node, keyPath, heading, skip);
  }

  private renderChildren(
    node: JsonSchema,
    keyPath: string[],
    heading: string,
    skip: string[] = [],
  ): void {
    for (const [key, child] of this.visible(node, keyPath)) {
      if (skip.includes(key)) {
        continue;
      }
      const childPath = [...keyPath, key];
      this.line(`${heading} \`${childPath.join('.')}\``);
      this.line();
      this.renderNode(child, childPath, node.required?.includes(key) ?? false, `${heading}#`);
    }
  }

  private renderUnion(
    node: JsonSchema,
    variants: JsonSchema[],
    discriminator: string,
    keyPath: string[],
    heading: string,
  ): void {
    if (node.description) {
      this.line(node.description);
      this.line();
    }

    const values = variants.flatMap((variant) => pinned(props(variant)[discriminator]) ?? []);
    this.line(
      `One of these shapes, chosen by \`${[...keyPath, discriminator].join('.')}\`: ${values.map(inline).join(', ')}.`,
    );
    this.line();

    // keys identical in every variant are listed once, before the variants
    const shared = Object.keys(props(variants[0])).filter(
      (key) =>
        key !== discriminator &&
        variants.every((variant) => _.isEqual(props(variant)[key], props(variants[0])[key])),
    );
    const sharedNode: JsonSchema = {
      ...variants[0],
      properties: Object.fromEntries(
        Object.entries(props(variants[0])).filter(([key]) => shared.includes(key)),
      ),
    };
    this.renderChildren(sharedNode, keyPath, heading);

    for (const variant of variants) {
      const accepted = pinned(props(variant)[discriminator]) ?? [];
      this.line(`${heading} When \`${discriminator}\` is ${accepted.map(inline).join(' or ')}`);
      this.line();
      this.renderObject(
        { ...variant, description: undefined, examples: undefined },
        keyPath,
        `${heading}#`,
        [discriminator, ...shared],
      );
    }
  }

  private renderLeaf(node: JsonSchema, keyPath: string[], isRequired: boolean): void {
    if (node.description) {
      this.line(node.description);
      this.line();
    }
    const defaultValue = _.get(this.defaults, keyPath);

    this.line(`- Type: ${renderType(node)}`);
    if (isRequired && defaultValue === undefined) {
      this.line('- Required');
    }
    if (defaultValue !== undefined) {
      this.line(`- Default: ${renderValue(defaultValue)}`);
    }
    if (node.examples?.length) {
      this.line(`- Examples: ${node.examples.map(inline).join(', ')}`);
    }
    this.line(`- Environment variable: \`${keyPath.join('__')}\``);
    this.line();
  }
}

/** The self-hoster's reference, built from the schema plus the values Ghost ships. */
export function buildMarkdownReference(): string {
  const schema = buildJsonSchema();
  // a self-hoster runs in production, so that env file is part of their defaults
  const defaults = _.merge(
    {},
    readJson('defaults.json'),
    readJson('env', 'config.production.json'),
  );
  const writer = new ReferenceWriter(defaults, readJson('overrides.json'));

  writer.line('# Ghost config reference');
  writer.line();
  writer.line(
    '<!-- Generated from core/shared/config/schema.ts by `pnpm --filter ghost config:reference`. Do not edit by hand. -->',
  );
  writer.line();
  writer.line(
    "Ghost reads config from `config.production.json` in the install directory, then from environment variables. Nest keys in JSON as they're written below; in an environment variable, join them with `__`.",
  );
  writer.line();
  writer.line(
    "Defaults are what a production install gets with nothing set. Keys Ghost sets itself, which config can't change, are left out. This page lists only keys that have a schema so far; Ghost reads others too.",
  );
  writer.line();

  for (const [key, node] of Object.entries(props(schema))) {
    writer.section(key, node);
  }

  return writer.toString();
}
