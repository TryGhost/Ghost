// Ghost's configured adapter manager is composed in boot. This re-export keeps
// existing consumers working until each receives its adapters from boot instead
// of looking them up here. Do not add new imports of this module.
export { default } from '../../../boot/adapters';
