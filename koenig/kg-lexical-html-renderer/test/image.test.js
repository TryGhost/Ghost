const {shouldRender} = require('./utils');

describe('Images', function () {
    it('should render', shouldRender({
        input: `{
            "root": {
              "children": [
                {
                  "altText": "This is Alt",
                  "caption": "This is a caption",
                  "src": "https://example.com/image.png",
                  "type": "image"
                }
              ],
              "direction": null,
              "format": "",
              "indent": 0,
              "type": "root",
              "version": 1
            }
          }`,
        output: `
        <figure>
            <img src="https://example.com/image.png" alt="This is Alt" /> 
                <figcaption>
                This is a caption
                </figcaption>
        </figure>
        `
    }));
});