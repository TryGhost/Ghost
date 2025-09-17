#!/usr/bin/env node

/**
 * Helper script to enable/disable loader testing delay
 * Usage:
 *   node test-loader.js enable  - Enable 3-second delay for testing
 *   node test-loader.js disable - Disable delay (normal loading)
 *   node test-loader.js status  - Show current status
 */

const args = process.argv.slice(2);
const command = args[0];

if (!command || !['enable', 'disable', 'status'].includes(command)) {
    console.log('Usage:');
    console.log('  node test-loader.js enable  - Enable 3-second delay for testing');
    console.log('  node test-loader.js disable - Disable delay (normal loading)');
    console.log('  node test-loader.js status  - Show current status');
    process.exit(1);
}

console.log('🎬 Ghost Loader Testing Helper');
console.log('================================');

switch (command) {
    case 'enable':
        console.log('✅ Enabling loader testing delay (3 seconds)');
        console.log('');
        console.log('To test:');
        console.log('1. Open browser developer tools');
        console.log('2. Run: localStorage.setItem("ghost-loader-test-delay", "true")');
        console.log('3. Refresh the Ghost admin page');
        console.log('4. Toggle dark mode to test both loaders');
        console.log('');
        console.log('The loader will stay visible for 3 seconds so you can see it clearly.');
        break;

    case 'disable':
        console.log('❌ Disabling loader testing delay');
        console.log('');
        console.log('To disable:');
        console.log('1. Open browser developer tools');
        console.log('2. Run: localStorage.removeItem("ghost-loader-test-delay")');
        console.log('3. Refresh the Ghost admin page');
        console.log('');
        console.log('Loading will return to normal speed.');
        break;

    case 'status':
        console.log('ℹ️  Current Status');
        console.log('');
        console.log('To check if delay is enabled:');
        console.log('1. Open browser developer tools');
        console.log('2. Run: localStorage.getItem("ghost-loader-test-delay")');
        console.log('');
        console.log('Returns "true" if enabled, null if disabled.');
        break;
}

console.log('');
console.log('💡 Pro Tips:');
console.log('- Test in both light and dark modes');
console.log('- Try changing system theme while loader is visible');
console.log('- Test in different Ghost admin sections (main admin, settings, etc.)');
console.log('- Remember to disable delay when done testing!');
