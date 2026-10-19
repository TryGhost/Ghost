// Settings loads in two stages (the navigation, then the sections), each with its
// own loading spinner. Once one of them has faded in, the next shows at once
// rather than vanishing for its own delay.
let spinnerShown = false;

export function hasSettingsSpinnerShown(): boolean {
  return spinnerShown;
}

export function markSettingsSpinnerShown(): void {
  spinnerShown = true;
}

export function resetSettingsSpinner(): void {
  spinnerShown = false;
}
