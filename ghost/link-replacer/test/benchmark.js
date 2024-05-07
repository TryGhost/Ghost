const {readFileSync} = require('node:fs');
const {Bench} = require('@probe.gl/bench');
const linkReplacer = require('../lib/link-replacer');
const linkReplacerNew = require('../lib/link-replacer-new');

// load html from file in ./fixtures/example-post.html
const html = readFileSync('./test/fixtures/example-post.html', {encoding: 'utf8', flag: 'r'});

const bench = new Bench()
    .group('LinkReplacer')
    .addAsync('cheerio', () => linkReplacer.replace(html, () => new URL('https://google.com/test-dir?test-query')))
    .addAsync('html5parser', () => linkReplacerNew.replace(html, () => new URL('https://google.com/test-dir?test-query')));

bench.run();
