import { serviceDependencyResolveOptions } from './service-dependencies.ts';

// The CLI exposes full resolver options through its webpackConfig hook. Its
// config loader needs a JS entrypoint; a .ts entrypoint would require ts-node.
export default { resolve: serviceDependencyResolveOptions };
