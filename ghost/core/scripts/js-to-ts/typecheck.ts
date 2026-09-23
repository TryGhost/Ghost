import { createHash } from 'node:crypto';
import path from 'node:path';

import ts from 'typescript';

export type TypeCheckError = {
  fileName: string | undefined;
  code: number;
  start: number | undefined;
  message: string;
};

function hash(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

function toError(diagnostic: ts.Diagnostic): TypeCheckError {
  return {
    fileName: diagnostic.file && path.resolve(diagnostic.file.fileName),
    code: diagnostic.code,
    start: diagnostic.start,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  };
}

function errorKey(error: TypeCheckError): string {
  return `${error.fileName}:${error.code}:${error.message}`;
}

/**
 * Type-checks a TypeScript project over and over as its files change,
 * reusing everything that didn't change between runs. Errors that already
 * existed when the checker was created are ignored.
 */
export class IncrementalTypeChecker {
  readonly options: ts.CompilerOptions;
  private readonly configPath: string;
  private readonly host: ts.CompilerHost;
  private readonly sourceFiles = new Map<string, { version: string; sourceFile: ts.SourceFile }>();
  private builder: ts.SemanticDiagnosticsBuilderProgram | undefined;
  private readonly baseline: Set<string>;

  constructor(configPath: string) {
    this.configPath = path.resolve(configPath);
    this.options = { ...this.parseConfig().options, noEmit: true, incremental: false };

    this.host = ts.createCompilerHost(this.options);
    const readSourceFile = this.host.getSourceFile.bind(this.host);
    this.host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
      const text = this.host.readFile(fileName);
      if (text === undefined) {
        return readSourceFile(fileName, languageVersion, onError, shouldCreate);
      }
      const version = hash(text);
      const cached = this.sourceFiles.get(fileName);
      if (cached?.version === version) {
        return cached.sourceFile;
      }
      const sourceFile = ts.createSourceFile(fileName, text, languageVersion);
      // The builder program compares versions to find changed files.
      (sourceFile as ts.SourceFile & { version: string }).version = version;
      this.sourceFiles.set(fileName, { version, sourceFile });
      return sourceFile;
    };

    this.baseline = new Set(this.check().map(errorKey));
  }

  private parseConfig(): ts.ParsedCommandLine {
    const parsed = ts.getParsedCommandLineOfConfigFile(
      this.configPath,
      {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
          throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        },
      },
    );
    if (!parsed) {
      throw new Error(`Could not parse ${this.configPath}`);
    }
    return parsed;
  }

  private check(): TypeCheckError[] {
    // Re-read the file list, since files are renamed between runs.
    const { fileNames } = this.parseConfig();
    this.builder = ts.createSemanticDiagnosticsBuilderProgram(
      fileNames,
      this.options,
      this.host,
      this.builder,
    );
    const program = this.builder;
    return [
      ...program.getConfigFileParsingDiagnostics(),
      ...program.getOptionsDiagnostics(),
      ...program.getGlobalDiagnostics(),
      ...program.getSyntacticDiagnostics(),
      ...program.getSemanticDiagnostics(),
    ]
      .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
      .map(toError);
  }

  /** Type-checks the project and returns errors that weren't in the baseline. */
  getNewErrors(): TypeCheckError[] {
    return this.check().filter((error) => !this.baseline.has(errorKey(error)));
  }
}
