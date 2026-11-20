// ua-parser-js 1.x ships no types, so this declares the surface Ghost's TypeScript uses. It
// types every `import` of the package in ghost.
declare module 'ua-parser-js' {
  type NameVersion = { name?: string; version?: string };

  namespace UAParser {
    interface IResult {
      ua: string;
      browser: NameVersion & { major?: string };
      engine: NameVersion;
      os: NameVersion;
      device: { model?: string; type?: string; vendor?: string };
      cpu: { architecture?: string };
    }
  }

  class UAParser {
    constructor(userAgent?: string);
    setUA(userAgent?: string): UAParser;
    getResult(): UAParser.IResult;
  }

  export = UAParser;
}
