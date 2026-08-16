// Times a fixed amount of JS compilation. Boot is dominated by V8 compiling modules,
// so this tracks the same hardware characteristic and gives the summary a way to tell
// "this runner is slower" apart from "this commit is slower". Prints milliseconds.
const vm = require('node:vm');

const ITERATIONS = 300;

// Built up-front so the measured loop is compilation only. Identifiers vary per
// iteration because V8's compilation cache would otherwise serve every repeat.
const sources = Array.from({length: ITERATIONS}, (_, i) => Array.from(
    {length: 800},
    (_, n) => `function f${i}_${n}(a, b) { return a * ${n} + b; }`
).join('\n'));

const start = process.hrtime.bigint();
for (let i = 0; i < ITERATIONS; i++) {
    new vm.Script(sources[i], {filename: `calibration-${i}.js`});
}

// Printed as a string: console.log of a number goes through util.inspect, which wraps
// it in ANSI colour codes when FORCE_COLOR is set, as it is across this workflow.
console.log(`${Math.round(Number(process.hrtime.bigint() - start) / 1e6)}`);
