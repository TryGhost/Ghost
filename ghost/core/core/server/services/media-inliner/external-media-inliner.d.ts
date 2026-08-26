declare class ExternalMediaInliner {
  constructor(deps: object);

  inline(domains: string[]): Promise<void>;
}

export = ExternalMediaInliner;
