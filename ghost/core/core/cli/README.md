# CLI Commands

## Writing new commands

Commands are classes which extend the base `Command` class (see [`command.js`](command.js)).

The only required override is the `handle()` method, which defines the logic for the command:
```javascript
const Command = require('./command');

module.exports = class REPL extends Command {
    async handle(argv = {}) {
        // this is where your logic is implemented
    }
};
```

### Arguments

Optionally, you can override the `setup()` method, where you can define any command-line arguments and help text etc:
```javascript
    setup() {
        this.help('A brief explanation of what your command does, shown when the --help flag is used');
        // arguments are passed to sywac - see https://sywac.io/docs/
        this.argument('--color', {type: 'string', defaultValue: 'yellow'});
    }
```

Arguments specified in `setup()` are accessed from the `argv` object passed to the `handle()` method:
```javascript
async handle(argv = {}) {
    this.log(`Your color is ${argv.color}`);
}
```

### Output

You can write console output using a number of helper methods:
```javascript
this.log('Writes a line to the console');
```

Available helpers are `log`, `ok`, `info`, `error`, `fatal`, `warn`, and `debug`.

### Interactive input

**Confirm an action** with:
```javascript
const confirm = await this.confirm('Are you sure you want to continue?');
if (!confirm) {
    // ...
}
```

**Ask for user input** with:
```javascript
const fruit = await this.ask('Favorite fruit?');
this.info(`You answered: ${fruit}`);
```

**Get masked input** with:
```javascript
const password = await this.secret('Password:');
this.log(`Your password is: ${password}`);
```

### Progress bars

You can show a progress bar to e.g. display progress through a long-running task.

`this.progressBar()` returns an instance of a [cli-progress](https://github.com/npkgz/cli-progress) progress bar. You can add a status to the output by calling `.update({status: 'Your status message'})`, and the progress bar can be advanced by `.increment()`:

```javascript
const progressBar = this.progressBar(listOfTasks.length);
for (const task in listOfTasks) {
    progressBar.update({status: `Running ${task.name}`});
    await task.run();
    progressBar.increment();
}
```

## Registering commands

New commands need to be registered in `ghost.js` before they can be called.

Commands are called by passing them to `command.run()` either as a class definition, or as the name of the file to be required in the `core/cli` directory.

`command.run()` is a static method on the Command class that handles instantiating the command, resolving arguments, and calling the `handle` method. You can instantiate and call a command outside of this structure, but you'll need to resolve/provide the arguments (`argv` object) manually.
