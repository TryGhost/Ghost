# Theme Fixtures

These files are used throughout our tests to mock themes in various states.

## Updating the Casper theme fixture
The casper fixture is a partial copy of the content/themes/casper folder.
It should not include any files that aren't needed to run the theme.

To update it:

1. Ensure your `content/themes/casper` folder is on the latest released version e.g.

- Run `yarn main`
- `cd content/themes/casper`
- `git log -20` - find the latest tag
- `git checkout vx.y.z` - checkout the latest tag

2. Ensure you are in side this folder (the fixtures/themes directory), remove casper entirely and then copy it across fresh:

- `cd tests/utils/fixtures/themes`
- `rm -rf casper`
- `rsync -rv --exclude '.git*' --exclude 'assets/css*' --exclude 'assets/js*' --exclude 'gulpfile.js' --exclude 'yarn.lock' --exclude 'README.md' ../../../../content/themes/casper .`

### Modifying theme fixtures
When a new rule is introduced in gscan one of these fixture files might break and you'll have to update a "zip" which isn't as easy as opening a text editor... It could become that one day but for now here are some commands to help out with the edit process

- Unzip the theme files, e.g.: `cd $CURRENT_DIR && unzip valid.zip -d valid`
- Make a change in the file which caused a warning/error/whatever
- Zip the files back: `cd valid; zip -r ../valid.zip * ; cd ..`
- Clean up `rm -rf ./valid`
- Commit changed zip file: `git add valid.zip ;... you know the drill :)`

Ideas for future improvements in theme tests:
- Decouple tests from file system as much as possible
- Track contents of what is in "zips" in source control. Right now, having a diff on a binary file is not useful at all
