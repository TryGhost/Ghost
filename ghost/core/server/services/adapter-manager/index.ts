import application from '../../../../bootstrap/app';

// Ghost's adapter manager is built once, by the application, from the registry
// and paths in ghost/bootstrap/adapters.ts, and the framework validates the
// configured adapters during start. This path is kept for the code that looks
// an adapter up by importing the manager. `getAdapter` resolves the active
// adapter and its options from config on each call, so runtime config changes
// are always reflected.
export default application.adapters;
