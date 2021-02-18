// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/gallery');
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
                        height: 1600,
                        href: 'https://example.com'
                    }
                ],
                caption: 'Test caption'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt></div><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo02-10.jpg" width="3200" height="1600" loading="lazy" alt></div><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo03-6.jpg" width="3200" height="1600" loading="lazy" alt></div></div><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo04-7.jpg" width="3200" height="1600" loading="lazy" alt="Alt test"></div><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo05-4.jpg" width="3200" height="1600" loading="lazy" alt title="Title test"></div><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo06-6.jpg" width="3200" height="1600" loading="lazy" alt></div></div><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo07-5.jpg" width="3200" height="1600" loading="lazy" alt></div><div class="kg-gallery-image"><a href="https://example.com"><img src="/content/images/2018/08/NatGeo09-8.jpg" width="3200" height="1600" loading="lazy" alt></a></div></div></div><figcaption>Test caption</figcaption></figure>');
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

    it('renders nothing with no valid images', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                images: [{src: 'undefined'}],
                caption: 'Test caption'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('');
    });

    it('renders images with alt text', function () {
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
                        height: 1600,
                        alt: 'alt test'
                    }
                ],
                caption: 'Test caption'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="alt test"></div></div></div><figcaption>Test caption</figcaption></figure>');
    });

    it('renders images with blank alt text', function () {
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
                    }
                ],
                caption: 'Test caption'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt></div></div></div><figcaption>Test caption</figcaption></figure>');
    });

    it('skips invalid images', function () {
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
                        src: '/content/images/2018/08/NatGeo02-10.jpg'
                    },
                    {
                        row: 0,
                        fileName: 'NatGeo03.jpg',
                        src: '/content/images/2018/08/NatGeo03-6.jpg',
                        width: 3200,
                        height: 1600
                    }
                ],
                caption: 'Test caption'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt></div><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo03-6.jpg" width="3200" height="1600" loading="lazy" alt></div></div></div><figcaption>Test caption</figcaption></figure>');
    });

    it('outputs width/height matching default max image width', function () {
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
                        fileName: 'photo-1591672299888-e16a08b6c7ce',
                        src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ',
                        width: 2500,
                        height: 1800
                    }
                ]
            },
            options: {
                imageOptimization: {
                    defaultMaxWidth: 2000,
                    contentImageSizes: {
                        w600: {width: 600},
                        w1000: {width: 1000},
                        w1600: {width: 1600},
                        w2400: {width: 2400}
                    }
                },
                canTransformImage: () => true
            }
        };

        const output = serializer.serialize(card.render(opts));

        // local is resized
        output.should.match(/width="2000"/);
        output.should.match(/height="1000"/);
        output.should.not.match(/width="3200"/);
        output.should.not.match(/height="1600"/);

        // unsplash is not
        output.should.match(/width="2500"/);
        output.should.match(/height="1800"/);
    });

    describe('srcset', function () {
        it('is included when image src is relative or Unsplash', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'NatGeo02.jpg',
                        src: '/subdir/support/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'photo-1591672299888-e16a08b6c7ce',
                        src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ',
                        width: 2000,
                        height: 1600
                    }]
                },
                options: {
                    imageOptimization: {
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    }
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt srcset="/content/images/size/w600/2018/08/NatGeo01-9.jpg 600w, /content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w, /content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w, /content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w" sizes="(min-width: 720px) 720px"></div><div class="kg-gallery-image"><img src="/subdir/support/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt srcset="/subdir/support/content/images/size/w600/2018/08/NatGeo01-9.jpg 600w, /subdir/support/content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w, /subdir/support/content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w, /subdir/support/content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w" sizes="(min-width: 720px) 720px"></div><div class="kg-gallery-image"><img src="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ" width="2000" height="1600" loading="lazy" alt srcset="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1000w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 2000w" sizes="(min-width: 720px) 720px"></div></div></div></figure>');
        });

        it('is omitted when target === email', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }]
                },
                options: {
                    canTransformImage: () => true,
                    imageOptimization: {
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    },
                    target: 'email'
                }
            };

            serializer.serialize(card.render(opts))
                .should.not.containEql('srcset=');
        });

        it('is omitted when no contentImageSizes are passed as options', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }]
                },
                options: {}
            };

            serializer.serialize(card.render(opts))
                .should.not.containEql('srcset=');
        });

        it('is omitted when `srcsets: false` is passed as an options', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }]
                },
                options: {
                    imageOptimization: {
                        srcsets: false,
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    }
                }
            };

            serializer.serialize(card.render(opts))
                .should.not.containEql('srcset=');
        });
    });

    describe('sizes', function () {
        it('is included for images over 720px', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 720,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'small.jpg',
                        src: '/subdir/support/content/images/2018/08/small.jpg',
                        width: 640,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'photo',
                        src: 'https://images.unsplash.com/photo?w=2000',
                        width: 2000,
                        height: 1600
                    }]
                },
                options: {
                    imageOptimization: {
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    }
                }
            };

            const output = serializer.serialize(card.render(opts));
            const sizes = output.match(/sizes="(.*?)"/g);

            sizes.length.should.equal(2);

            output.should.match(/standard\.jpg 720w" sizes="\(min-width: 720px\) 720px"/);
            output.should.match(/photo\?w=2000 2000w" sizes="\(min-width: 720px\) 720px"/);
        });

        it('uses "wide" media query for large single-image galleries', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 2000,
                        height: 1600
                    }]
                },
                options: {
                    imageOptimization: {
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    }
                }
            };

            serializer.serialize(card.render(opts)).should.match(/standard\.jpg 2000w" sizes="\(min-width: 1200px\) 1200px"/);
        });

        it('uses "standard" media query for medium single-image galleries', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 1000,
                        height: 1600
                    }]
                },
                options: {
                    imageOptimization: {
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    }
                }
            };

            serializer.serialize(card.render(opts)).should.match(/standard\.jpg 1000w" sizes="\(min-width: 720px\) 720px"/);
        });

        it('is omitted when srcsets are not available', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 720,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'small.jpg',
                        src: '/subdir/support/content/images/2018/08/small.jpg',
                        width: 640,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'photo',
                        src: 'https://images.unsplash.com/photo?w=2000',
                        width: 2000,
                        height: 1600
                    }]
                },
                options: {
                    imageOptimization: {
                        srcsets: false,
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    }
                }
            };

            const output = serializer.serialize(card.render(opts));
            const sizes = output.match(/sizes="(.*?)"/g);

            should.not.exist(sizes);
        });
    });

    describe('email target', function () {
        it('adds width/height and uses resized images', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 720,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'small.jpg',
                        src: '/subdir/support/content/images/2018/08/small.jpg',
                        width: 300,
                        height: 800
                    }, {
                        row: 1,
                        fileName: 'photo.jpg',
                        src: '/content/images/2018/08/photo.jpg',
                        width: 2000,
                        height: 1600
                    }, {
                        row: 1,
                        fileName: 'unsplash.jpg',
                        src: 'https://images.unsplash.com/unsplash.jpg?w=2000',
                        width: 2000,
                        height: 1600
                    }]
                },
                options: {
                    target: 'email',
                    canTransformImage: () => true,
                    imageOptimization: {
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    }
                }
            };

            const output = serializer.serialize(card.render(opts));

            // 3 images wider than 600px template width resized to fit
            output.match(/width="600"/g).length.should.equal(3);
            // 1 image smaller than template width
            output.should.match(/width="300"/);

            output.should.match(/height="1333"/);
            output.should.match(/height="800"/);
            output.should.match(/height="480"/);

            // original because image is < 1600
            output.should.match(/\/content\/images\/2018\/08\/standard\.jpg/);
            // original because image is < 300
            output.should.match(/\/subdir\/support\/content\/images\/2018\/08\/small\.jpg/);
            // resized because image is > 1600
            output.should.match(/\/content\/images\/size\/w1600\/2018\/08\/photo\.jpg/);
            // resized unsplash image
            output.should.match(/https:\/\/images\.unsplash\.com\/unsplash\.jpg\?w=1200/);
        });

        it('resizes width/height attributes but uses original image when local image can\'t be transformed', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    images: [{
                        row: 0,
                        fileName: 'image.png',
                        src: '/content/images/2020/06/image.png',
                        width: 3000,
                        height: 2000
                    }]
                },
                options: {
                    target: 'email',
                    canTransformImage: () => false,
                    imageOptimization: {
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    }
                }
            };

            const output = serializer.serialize(card.render(opts));

            output.should.not.match(/width="3000"/);
            output.should.match(/width="600"/);
            output.should.not.match(/height="2000"/);
            output.should.match(/height="400"/);
            output.should.not.match(/\/content\/images\/size\/w1600\/2020\/06\/image\.png/);
            output.should.match(/\/content\/images\/2020\/06\/image\.png/);
        });
    });

    it('transforms urls absolute to relative', function () {
        let payload = {
            images: [
                {
                    row: 0,
                    fileName: 'NatGeo01.jpg',
                    src: 'http://127.0.0.1:2369/content/images/2018/08/NatGeo01-9.jpg',
                    width: 3200,
                    height: 1600,
                    caption: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
                },
                {
                    row: 0,
                    fileName: 'NatGeo02.jpg',
                    src: 'http://127.0.0.1:2369/content/images/2018/08/NatGeo02-10.jpg',
                    caption: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
                }
            ],
            caption: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
        };

        const transformed = card.absoluteToRelative(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        transformed.images[0].src
            .should.equal('/content/images/2018/08/NatGeo01-9.jpg');

        transformed.images[0].caption
            .should.equal('A link to <a href="/post">an internal post</a>');

        transformed.images[1].src
            .should.equal('/content/images/2018/08/NatGeo02-10.jpg');

        transformed.images[1].caption
            .should.equal('A link to <a href="/post">an internal post</a>');

        transformed.caption
            .should.equal('A link to <a href="/post">an internal post</a>');
    });

    it('transforms urls relative to absolute', function () {
        let payload = {
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
                    src: '/content/images/2018/08/NatGeo02-10.jpg'
                }
            ],
            caption: 'A link to <a href="/post">an internal post</a>'
        };

        const transformed = card.relativeToAbsolute(payload, {siteUrl: 'http://127.0.0.1:2369/', itemUrl: 'http://127.0.0.1:2369/post'});

        transformed.images[0].src
            .should.equal('http://127.0.0.1:2369/content/images/2018/08/NatGeo01-9.jpg');

        transformed.images[1].src
            .should.equal('http://127.0.0.1:2369/content/images/2018/08/NatGeo02-10.jpg');

        transformed.caption
            .should.equal('A link to <a href="http://127.0.0.1:2369/post">an internal post</a>');
    });
});
