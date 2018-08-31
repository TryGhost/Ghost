const should = require('should');
const card = require('../../../../../server/lib/mobiledoc/cards/gallery');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Gallery card', function () {
    it('renders a gallery', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                images: [
                    {
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: 0,
                        fileName: 'NatGeo02.jpg',
                        src: '/content/images/2018/08/NatGeo02-10.jpg',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: 0,
                        fileName: 'NatGeo03.jpg',
                        src: '/content/images/2018/08/NatGeo03-6.jpg',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: 1,
                        fileName: 'NatGeo04.jpg',
                        src: '/content/images/2018/08/NatGeo04-7.jpg',
                        alt: 'Alt test',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: 1,
                        fileName: 'NatGeo05.jpg',
                        src: '/content/images/2018/08/NatGeo05-4.jpg',
                        title: 'Title test',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: 1,
                        fileName: 'NatGeo06.jpg',
                        src: '/content/images/2018/08/NatGeo06-6.jpg',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: 2,
                        fileName: 'NatGeo07.jpg',
                        src: '/content/images/2018/08/NatGeo07-5.jpg',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: 2,
                        fileName: 'NatGeo09.jpg',
                        src: '/content/images/2018/08/NatGeo09-8.jpg',
                        width: 3200,
                        height: 1600
                    }
                ],
                caption: 'Test caption'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600"></div><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo02-10.jpg" width="3200" height="1600"></div><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo03-6.jpg" width="3200" height="1600"></div></div><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo04-7.jpg" width="3200" height="1600" alt="Alt test"></div><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo05-4.jpg" width="3200" height="1600" title="Title test"></div><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo06-6.jpg" width="3200" height="1600"></div></div><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo07-5.jpg" width="3200" height="1600"></div><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo09-8.jpg" width="3200" height="1600"></div></div></div><figcaption>Test caption</figcaption></figure>');
    });

    it('renders nothing with no images', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                images: [],
                caption: 'Test caption'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('');
    });
});
