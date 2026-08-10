// Declaration shim so the TS FileStore adapter can reuse the legacy YAML
// parser (and its error semantics) until it's deleted in HKG-1898.
declare function parseYaml(file: string): unknown;
export = parseYaml;
