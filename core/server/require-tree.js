var when = require('when'),
    keys = require('when/keys'),
    fs = require('fs'),
    path = require('path'),
    extend = function (obj, source) {
        var key;
        for (key in source) {
            if (source.hasOwnProperty(key)) {
                obj[key] = source[key];
            }
        }
        return obj;
    },
    readDir = function (dir, options, depth) {
        depth = depth || 0;

        options = extend({
            index: true
        }, options);

        if (depth > 1) {
            return null;
        }

        var subtree = {},
            treeDeferred = when.defer(),
            treePromise = treeDeferred.promise;

        fs.readdir(dir, function (error, files) {
            if (error) {
                return treeDeferred.reject(error);
            }

            files = files || [];

            files.forEach(function (file) {
                var fileDeferred = when.defer(),
                    filePromise = fileDeferred.promise,
                    ext   = path.extname(file),
                    name  = path.basename(file, ext),
                    fpath = path.join(dir, file);
                subtree[name] = filePromise;
                fs.lstat(fpath, function (error, result) {
                    if (result.isDirectory()) {
                        fileDeferred.resolve(readDir(fpath, options, depth + 1));
                    } else {
                        fileDeferred.resolve(fpath);
                    }
                });
            });

            return keys.all(subtree).then(function (theFiles) {
                return treeDeferred.resolve(theFiles);
            });
        });

        return when(treePromise).then(function (prom) {
            return prom;
        });
    },
    readAll = function (dir, options, depth) {
        return when(readDir(dir, options, depth)).then(function (paths) {
            return paths;
        });
    };

module.exports = readAll;