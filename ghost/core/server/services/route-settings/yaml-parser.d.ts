// Declaration shim so the TS store adapters can reuse the YAML parser
// (and its error semantics).
declare function parseYaml(file: string): unknown;
export = parseYaml;
