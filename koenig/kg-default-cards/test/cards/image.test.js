// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/image');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Image card', function () {
    it('renders an image', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image" alt></figure>');
    });

    it('renders an image with caption', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png',
                caption: '<b>Test caption</b>'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card kg-card-hascaption"><img src="https://www.ghost.org/image.png" class="kg-image" alt><figcaption><b>Test caption</b></figcaption></figure>');
    });

    it('renders an image with alt text', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png',
                alt: 'example image'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image" alt="example image"></figure>');
    });

    it('renders an image with blank alt text', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image" alt></figure>');
    });

    it('renders an image with title attribute', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png',
                title: 'example image'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image" alt title="example image"></figure>');
    });

    it('renders nothing with no src', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: '',
                caption: 'Test caption'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('');
    });

    describe('sizes', function () {
        it('standard', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://www.ghost.org/image.png',
                    cardWidth: ''
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image" alt></figure>');
        });

        it('wide', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://www.ghost.org/image.png',
                    cardWidth: 'wide'
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card kg-width-wide"><img src="https://www.ghost.org/image.png" class="kg-image" alt></figure>');
        });

        it('full', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://www.ghost.org/image.png',
                    cardWidth: 'full'
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card kg-width-full"><img src="https://www.ghost.org/image.png" class="kg-image" alt></figure>');
        });
    });

    describe('srcset attribute', function () {
        it('is included when src is relative', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: '/content/images/2020/06/image.png',
                    width: 3000,
                    height: 6000
                },
                options: {
                    contentImageSizes: {
                        w600: {width: 600},
                        w1000: {width: 1000},
                        w1600: {width: 1600},
                        w2400: {width: 2400}
                    }
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="/content/images/2020/06/image.png" class="kg-image" alt srcset="/content/images/size/w600/2020/06/image.png 600w, /content/images/size/w1000/2020/06/image.png 1000w, /content/images/size/w1600/2020/06/image.png 1600w, /content/images/size/w2400/2020/06/image.png 2400w"></figure>');
        });

        it('is omitted when no contentImageSizes are passed as options', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: '/content/images/2020/06/image.png',
                    width: 3000,
                    height: 6000
                },
                options: {}
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="/content/images/2020/06/image.png" class="kg-image" alt></figure>');
        });

        it('is omitted when `srcsets: false` is passed in as an option', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: '/content/images/2020/06/image.png',
                    width: 3000,
                    height: 6000
                },
                options: {
                    srcsets: false,
                    contentImageSizes: {
                        w600: {width: 600},
                        w1000: {width: 1000},
                        w1600: {width: 1600},
                        w2400: {width: 2400}
                    }
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="/content/images/2020/06/image.png" class="kg-image" alt></figure>');
        });

        it('is omitted when no width is provided', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: '/content/images/2020/06/image.png',
                    height: 6000
                },
                options: {
                    contentImageSizes: {
                        w600: {width: 600},
                        w1000: {width: 1000},
                        w1600: {width: 1600},
                        w2400: {width: 2400}
                    }
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="/content/images/2020/06/image.png" class="kg-image" alt></figure>');
        });

        it('is omitted when image is smaller than minimum responsive width', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: '/content/images/2020/06/image.png',
                    width: 500,
                    height: 700
                },
                options: {
                    contentImageSizes: {
                        w600: {width: 600},
                        w1000: {width: 1000},
                        w1600: {width: 1600},
                        w2400: {width: 2400}
                    }
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="/content/images/2020/06/image.png" class="kg-image" alt></figure>');
        });

        it('omits sizes larger than image width and includes original image width if smaller than largest responsive width', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: '/content/images/2020/06/image.png',
                    width: 750,
                    height: 300
                },
                options: {
                    contentImageSizes: {
                        w600: {width: 600},
                        w1000: {width: 1000},
                        w1600: {width: 1600},
                        w2400: {width: 2400}
                    }
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="/content/images/2020/06/image.png" class="kg-image" alt srcset="/content/images/size/w600/2020/06/image.png 600w, /content/images/size/w750/2020/06/image.png 750w"></figure>');
        });

        it('works correctly with subdirectories', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: '/subdir/content/images/2020/06/image.png',
                    width: 3000,
                    height: 6000
                },
                options: {
                    contentImageSizes: {
                        w600: {width: 600},
                        w1000: {width: 1000},
                        w1600: {width: 1600},
                        w2400: {width: 2400}
                    }
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="/subdir/content/images/2020/06/image.png" class="kg-image" alt srcset="/subdir/content/images/size/w600/2020/06/image.png 600w, /subdir/content/images/size/w1000/2020/06/image.png 1000w, /subdir/content/images/size/w1600/2020/06/image.png 1600w, /subdir/content/images/size/w2400/2020/06/image.png 2400w"></figure>');
        });

        it('is included when src is an Unsplash image', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ',
                    width: 3000,
                    height: 6000
                },
                options: {
                    contentImageSizes: {
                        w600: {width: 600},
                        w1000: {width: 1000},
                        w1600: {width: 1600},
                        w2400: {width: 2400}
                    }
                }
            };

            // note that '&' in URLs will be rendered as '&amp;' to maintain HTML encoding
            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ" class="kg-image" alt srcset="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1000w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2400&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 2400w"></figure>');
        });

        it('has same size omission behaviour for Unsplash as local files', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ',
                    width: 750,
                    height: 300
                },
                options: {
                    contentImageSizes: {
                        w600: {width: 600},
                        w1000: {width: 1000},
                        w1600: {width: 1600},
                        w2400: {width: 2400}
                    }
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-card kg-image-card"><img src="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ" class="kg-image" alt srcset="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=750&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 750w"></figure>');
        });
    });

    it('transforms urls absolute to relative', function () {
        let payload = {
            src: 'http://127.0.0.1:2369/content/images/2018/08/NatGeo01-9.jpg',
            caption: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
        };

        const transformed = card.absoluteToRelative(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        transformed.src
            .should.equal('/content/images/2018/08/NatGeo01-9.jpg');

        transformed.caption
            .should.equal('A link to <a href="/post">an internal post</a>');
    });

    it('transforms urls relative to absolute', function () {
        let payload = {
            src: '/content/images/2018/08/NatGeo01-9.jpg',
            caption: 'A link to <a href="/post">an internal post</a>'
        };

        const transformed = card.relativeToAbsolute(payload, {siteUrl: 'http://127.0.0.1:2369/', itemUrl: 'http://127.0.0.1:2369/post'});

        transformed.src
            .should.equal('http://127.0.0.1:2369/content/images/2018/08/NatGeo01-9.jpg');

        transformed.caption
            .should.equal('A link to <a href="http://127.0.0.1:2369/post">an internal post</a>');
    });
});
