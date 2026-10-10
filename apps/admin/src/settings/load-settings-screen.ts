export const loadSettingsScreen = () => import('./settings');

/** Starts loading Settings' code, navigation and sections, ahead of a navigation to it. */
export function preloadSettingsScreen() {
  void loadSettingsScreen();
  void import('./layout/main-content');
}
