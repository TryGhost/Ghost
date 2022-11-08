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
                  "type": "image",
                  "cardWidth": "regular"
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
        <figure class="kg-card kg-image-card">
            <img src="https://example.com/image.png" alt="This is Alt" />
                <figcaption>
                This is a caption
                </figcaption>
        </figure>
        `
    }));
    it('should render wide image', shouldRender({
        input: `{
            "root": {
              "children": [
                {
                  "altText": "This is Alt",
                  "caption": "This is a caption",
                  "src": "https://example.com/image.png",
                  "type": "image",
                  "cardWidth": "wide"
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
        <figure class="kg-card kg-image-card kg-width-wide">
            <img src="https://example.com/image.png" alt="This is Alt" />
                <figcaption>
                This is a caption
                </figcaption>
        </figure>
        `
    }));

    it('should render full image', shouldRender({
        input: `{
          "root": {
            "children": [
              {
                "altText": "This is Alt",
                "caption": "This is a caption",
                "src": "https://example.com/image.png",
                "type": "image",
                "cardWidth": "full"
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
        <figure class="kg-card kg-image-card kg-width-full">
            <img src="https://example.com/image.png" alt="This is Alt" />
                <figcaption>
                This is a caption
                </figcaption>
        </figure>
        `
    }));
});