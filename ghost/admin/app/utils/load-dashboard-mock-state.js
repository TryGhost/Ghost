export function loadDashboardMockState() {
    const state = {
        savedState: null,
        savedStatus: null,
        enabledStr: null
    };

    try {
        const savedState = localStorage.getItem('dashboard5-prototype-state');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            if (parsed) {
                state.savedState = parsed;
            }
        }

        const savedStatus = localStorage.getItem('dashboard5-prototype-status');
        if (savedStatus) {
            const parsed = JSON.parse(savedStatus);
            if (parsed) {
                state.savedStatus = parsed;
            }
        }

        const enabledStr = localStorage.getItem('dashboard5-prototype-enabled');
        if (enabledStr) {
            const parsed = JSON.parse(enabledStr);
            if (typeof parsed === 'boolean') {
                state.enabledStr = parsed;
            }
        }
    } catch (e) {
        // localStorage might not be available
    }

    return state;
}