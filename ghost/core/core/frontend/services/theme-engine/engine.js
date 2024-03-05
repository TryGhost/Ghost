const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const hbs = require('express-hbs');
const config = require('../../../shared/config');
const instance = hbs.create();

// @TODO think about a config option for this e.g. theme.devmode?
if (config.get('env') !== 'production') {
    instance.handlebars.logger.level = 0;
}
class DataReader extends Handlebars.Visitor {
    constructor(data, filepath, exhbs, partialsPath) {
        super();
        this.data = data || new Set();
        this.filename = filepath;
        this.exhbs = exhbs;
        this.partialsPath = partialsPath;
    }

    CommentStatement(comment) {
        const layoutRegex = /<\s+([A-Za-z0-9\._\-\/]+)\s*/;
        const [isLayout, layoutName] = comment.value.match(layoutRegex) || [false, null];

        if (isLayout) {
            try {
                const layoutFilePath = this.exhbs.layoutPath(this.filename, layoutName);
                const layoutContent = fs.readFileSync(layoutFilePath + '.hbs').toString();
                const ast = Handlebars.parseWithoutProcessing(layoutContent);
                const reader = new DataReader(this.data, layoutFilePath, this.exhbs, this.partialsPath);
                reader.accept(ast);
            } catch (err) {
                console.error(err);
            }
        }
    }

    PathExpression(path) {
        if (path.data) {
            this.data.add(path.original);
        }
    }

    PartialStatement(partial) {
        if (!this.partialsPath) {
            throw new Error('No partials path, but found a partial');
        }
        const partialFilePath = path.join(this.partialsPath, partial.name.original);
        try {
            const partialContent = fs.readFileSync(partialFilePath + '.hbs').toString();
            const ast = Handlebars.parseWithoutProcessing(partialContent);
            const reader = new DataReader(this.data, partialFilePath, this.exhbs, this.partialsPath);
            reader.accept(ast);
        } catch (err) {
            console.error(err);
        }
    }

    static getData(exhbs, source, filename, partialsPath) {
        const ast = Handlebars.parseWithoutProcessing(source);
        const reader = new DataReader(new Set(), filename, exhbs, partialsPath);
        reader.accept(ast);
        return reader.data;
    }
}

instance.escapeExpression = instance.handlebars.Utils.escapeExpression;

instance.configure = function configure(partialsPath, themePath) {
    const helperTemplatesPath = config.get('paths').helperTemplates;
    const hbsOptions = {
        partialsDir: [config.get('paths').helperTemplates],
        onCompile: function onCompile(exhbs, source, filename) {
            if (filename.startsWith(helperTemplatesPath)) {
                return exhbs.handlebars.compile(source, {preventIndent: true});
            }
            if (partialsPath && filename.startsWith(partialsPath)) {
                return exhbs.handlebars.compile(source, {preventIndent: true});
            }

            const data = DataReader.getData(exhbs, source, filename, partialsPath);

            if (!exhbs.datamap) {
                exhbs.datamap = {};
            }

            exhbs.datamap[filename] = data;

            return exhbs.handlebars.compile(source, {preventIndent: true});
        },
        restrictLayoutsTo: themePath
    };

    if (partialsPath) {
        hbsOptions.partialsDir.push(partialsPath);
    }

    return instance.express4(hbsOptions);
};

module.exports = instance;
