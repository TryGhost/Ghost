var Multer = require('multer'),
    path = require('path'),
    os = require('os'),
    crypto = require('crypto'),
    storage,
    ghostMulter;

/*
    Multer storage...
    Mimics busboy behaviour...

*/

storage = Multer.diskStorage ({

    destination:function (req,file,cb) {
        var tmpdir = os.tmpdir();
        return cb(null,tmpdir);
    },

    filename:function (req,file,cb) {
        var md5, tmpFilename, tmpdir;
        md5 = crypto.createHash('md5');
        md5.update(file.originalname,'utf-8');
        tmpFilename = (new Date()).getTime() + md5.digest('hex');
        tmpFilename = tmpFilename || 'temp.tmp';
        tmpdir = os.tmpdir();
        req.files = req.files || {};
        req.files[file.fieldname] = {
            type:file.mimetype,
            encoding:file.encoding,
            path:path.join(tmpdir,tmpFilename),
            name:file.originalname
        };
        return cb(null,tmpFilename);
    }
});

ghostMulter = new Multer({storage:storage}).single('uploadimage');
module.exports = ghostMulter;
