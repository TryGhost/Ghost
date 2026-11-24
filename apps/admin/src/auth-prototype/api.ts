// Everything the rest of Admin imports from the auth prototype. To remove the
// prototype, delete this folder and the lines marked `// auth-prototype`.
export { isAuthPrototypeEnabled, useAuthPrototypeEnabled } from './enabled';
export { AuthPrototypePanel } from './demo-panel';
export { SecuritySettingsGroup } from './security-settings-group';
export { securitySearchKeywords } from './security-keywords';
export { SecurityNavItem } from './security-nav-item';
export { SecurityTab } from './two-factor/security-tab';
export { useShowSecurityTab } from './two-factor/use-show-security-tab';
export { StaffMethodBadges } from './two-factor/staff-method-badges';
export { authPrototypeRoutes } from './signin/routes';
