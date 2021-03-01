### Modifying theme fixtures
When a new rule is introduced in gscan one of these fixture files might break and you'll have to update a "zip" which isn't as easy as opening a text editor... It could become that one day but for now here are some commands to help out with the edit process

- Unzip the theme files, e.g.: `cd $CURRENT_DIR && unzip valid.zip -d valid`
- Make a change in the file which caused a warning/error/whatever
- Zip the files back: ``
- Commit changed zip file: `git add valid.zip ;... you know the drill :)`

Ideas for future improvements in theme tests:
- Decouple tests from file system as much as possible
- Track contents of what is in "zips" in source control. Right now, having a diff on a binary file is not useful at all
