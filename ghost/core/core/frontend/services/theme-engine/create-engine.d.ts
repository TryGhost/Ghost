declare function createEngine(deps: {deploymentConfig: {get: (key: string) => unknown}}): object;

export = createEngine;
