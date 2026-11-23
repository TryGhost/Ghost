// EARMARKED. Ghost's adapter manager is built by the bootstrap from the foundry's class and
// Ghost's values. This path returns that instance for the legacy modules that import it. It
// leaves when whatever needs an adapter is handed one.
export { default } from '../../../../bootstrap/transition/adapter-manager';
