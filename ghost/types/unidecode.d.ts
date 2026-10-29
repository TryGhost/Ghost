// unidecode ships no types, so this declares the surface Ghost's TypeScript uses. It types
// every `import` of the package in ghost.
declare module 'unidecode' {
  /** The text transliterated to ASCII. */
  function unidecode(input: string): string;
  export = unidecode;
}
