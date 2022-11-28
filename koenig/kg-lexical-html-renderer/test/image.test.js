const Renderer = require('../index');
const Prettier = require('prettier');

describe('Images', function () {
    let imageState;
    let lexicalState;
    let options;

    beforeEach(async function () {
        imageState = {
            src: '/content/images/2022/11/koenig-lexical.jpg',
            type: 'image',
            cardWidth: 'regular'
        };

        lexicalState = {
            root: {
                children: [imageState],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        options = {
            imageOptimization: {
                contentImageSizes: {
                    w600: {width: 600},
                    w1000: {width: 1000},
                    w1600: {width: 1600},
                    w2400: {width: 2400}
                }
            }
        };
    });

    it('renders an image', function () {
        const output = Prettier.format((new Renderer()).render(JSON.stringify(lexicalState), options), {parser: 'html'});
        const expected = 
`<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/11/koenig-lexical.jpg" alt="" loading="lazy" />
</figure>
`;
        output.should.equal(expected);
    });
    
    it('renders an image with caption and blank alt', function () {
        imageState.caption = 'This is a caption';
        const output = Prettier.format((new Renderer()).render(JSON.stringify(lexicalState), options), {parser: 'html'});
        const expected = 
`<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/11/koenig-lexical.jpg" alt="" loading="lazy" />
  <figcaption>This is a caption</figcaption>
</figure>
`;
        output.should.equal(expected);
    });

    it('renders an image with alt text', function () {
        imageState.altText = 'This is Alt';
        const output = Prettier.format((new Renderer()).render(JSON.stringify(lexicalState), options), {parser: 'html'});
        output.should.containEql('alt="This is Alt"');
    });

    it('renders a wide image', function () {
        imageState.cardWidth = 'wide';
        const output = (new Renderer()).render(JSON.stringify(lexicalState), options);
        output.should.containEql('kg-width-wide');
    });

    it('renders a full width image', function () {
        imageState.cardWidth = 'full';
        const output = (new Renderer()).render(JSON.stringify(lexicalState), options);
        output.should.containEql('kg-width-full');
    });

    it('renders image dimensions', function () {
        imageState.width = 3000;
        imageState.height = 6000;
        const output = (new Renderer()).render(JSON.stringify(lexicalState), options);
        output.should.containEql('width="3000"');
        output.should.containEql('height="6000"');
    });

    it('renders image with srcset', function () {
        imageState.width = 3000;
        imageState.height = 6000;
        const srcset = '/content/images/size/w600/2022/11/koenig-lexical.jpg 600w, /content/images/size/w1000/2022/11/koenig-lexical.jpg 1000w, /content/images/size/w1600/2022/11/koenig-lexical.jpg 1600w, /content/images/size/w2400/2022/11/koenig-lexical.jpg 2400w';
        const output = (new Renderer()).render(JSON.stringify(lexicalState), options);
        output.should.containEql(srcset);
    });

    it('renders image with srcset and sizes', function () {
        imageState.width = 3000;
        imageState.height = 6000;
        const srcset = '/content/images/size/w600/2022/11/koenig-lexical.jpg 600w, /content/images/size/w1000/2022/11/koenig-lexical.jpg 1000w, /content/images/size/w1600/2022/11/koenig-lexical.jpg 1600w, /content/images/size/w2400/2022/11/koenig-lexical.jpg 2400w';
        const sizes = 'sizes="(min-width: 720px) 720px"';
        const output = (new Renderer()).render(JSON.stringify(lexicalState), options);
        output.should.containEql(srcset);
        output.should.containEql(sizes);
    });

    it('use resized width and height when theres max width', function () {
        imageState.width = 3000;
        imageState.height = 6000;
        // add defaultMaxWidth property to options
        options.imageOptimization.defaultMaxWidth = 2000;
        options.canTransformImage = () => true;

        const output = (new Renderer()).render(JSON.stringify(lexicalState), options);
        output.should.containEql('width="2000"');
        output.should.containEql('height="4000"');
    });

    it('is includes srcset when src is an unsplash image', function () {
        imageState.width = 3000;
        imageState.height = 6000;
        imageState.src = 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ';
        const srcset = 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1000w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2400&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 2400w';
        const output = (new Renderer()).render(JSON.stringify(lexicalState), options);
        output.should.containEql(srcset);
    });

    it('adds sizes attribute for regular images', function () {
        imageState.width = 3000;
        imageState.height = 6000;
        const sizes = 'sizes="(min-width: 720px) 720px"';
        const output = (new Renderer()).render(JSON.stringify(lexicalState), options);
        output.should.containEql(sizes);
    });

    it('should ommit srcset when target is email', function () {
        options.target = 'email';
        const output = (new Renderer()).render(JSON.stringify(lexicalState), options);
        output.should.not.containEql('srcset');
    });

    it('renders image with title attribute', function () {
        imageState.title = 'Test title';
        const output = (new Renderer()).render(JSON.stringify(lexicalState), options);
        output.should.containEql('title="Test title"');
    });
});
