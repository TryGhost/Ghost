# Content / Adapters


An adapter is a way to override a default behaviour in Ghost.
The default behaviour in Ghost is as following:

### LocalFileStorage
By default Ghost will upload your images to the `content/images` folder.
The LocalFileStorage is using the file system to read or write images.
This default adapter can be found in `core/server/adapters/storage/LocalFileStorage.js`.

### SchedulingDefault
By default Ghost will schedule your posts using a pure JavaScript solution.
It doesn't use `cron` or similar.
This default adapter can be found in `core/server/adapters/scheduling/SchedulingDefault.js`.

### Custom Adapter
To override any of the default adapters, you have to add a folder (`content/adapters/storage` or `content/adapters/scheduling`) and copy your adapter to it.

Please follow our detailed guides:
https://ghost.org/docs/concepts/storage-adapters/
https://ghost.org/docs/concepts/custom-schedulers/
