// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const renderer = require('../');

describe('Markdown HTML renderer', function () {
    describe('latest', function () {
        it('outputs urlencoded headers', function () {
            const markdown = `
# Header One

## Héader Two
`;

            const result = renderer.render(markdown, {ghostVersion: '4.0'});
            result.should.match(/<h1 id="header-one">/);
            result.should.match(/<h2 id="h%C3%A9ader-two">/);
        });

        it('outputs `loading="lazy"` on images', function () {
            const markdown = `![](https://mysite.com/content/images/lazy.png)`;
            const result = renderer.render(markdown, {ghostVersion: '3.0'});
            result.should.containEql('loading="lazy"');
        });
    });

    describe('<4.x', function () {
        it('outputs `loading="lazy"` on images', function () {
            const markdown = `![](https://mysite.com/content/images/lazy.png)`;
            const result = renderer.render(markdown, {ghostVersion: '3.0'});
            result.should.containEql('loading="lazy"');
        });

        it('outputs backwards compatible headers', function () {
            const markdown = `
# Header One

## Héader Two
`;

            const result = renderer.render(markdown, {ghostVersion: '3.0'});
            result.should.match(/<h1 id="headerone">/);
            result.should.match(/<h2 id="hadertwo">/);
        });
    });
});
