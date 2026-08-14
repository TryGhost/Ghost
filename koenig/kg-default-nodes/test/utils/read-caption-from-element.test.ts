import should from 'should';
import {JSDOM} from 'jsdom';
import {readCaptionFromElement} from '../../src/utils/read-caption-from-element.js';

describe('readCaptionFromElement', function () {
    it('skips empty cleaned caption fragments when joining captions', function () {
        const document = (new JSDOM(`
            <figure>
                <figcaption><p>First</p></figcaption>
                <figcaption><p> </p></figcaption>
                <figcaption><p>Third</p></figcaption>
            </figure>
        `)).window.document;

        const caption = readCaptionFromElement(document.querySelector('figure')!);

        should(caption).equal('<p>First</p> / <p>Third</p>');
    });
});
