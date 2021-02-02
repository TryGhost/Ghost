const argv = process.argv;

const mode = argv[2] || 'new';

// Switch between boot modes
switch (mode) {
case 'old':
case '3':
    // Old boot sequence
    require('./startup');
    break;
default:
    // New boot sequence
    require('./core/boot')();
}
