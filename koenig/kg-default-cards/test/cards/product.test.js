// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/product');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Product card', function () {
    describe('front-end render', function () {
        it('renders the product nodes with card wrapper element', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButton: 'Click me',
                    productButtonEnabled: true,
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://example.com/images/ok.jpg',
                    productRatingEnabled: true,
                    productStarRating: 3,
                    productTitle: 'Product title!',
                    productUrl: 'https://example.com/product/ok'
                }
            };

            const html = `<div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" loading="lazy" /><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span></div><div class="kg-product-card-description">This product is ok</div><a href="https://example.com/product/ok" class="kg-product-card-button kg-product-card-btn-accent" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div></div>`;

            serializer.serialize(card.render(opts)).should.equal(html);
        });
    });

    describe('render requirements', function () {
        it('renders nothing if title, description, and button is missing', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productTitle: '',
                    productDescription: ''
                }
            };

            serializer.serialize(card.render(opts)).should.equal('');
        });

        it('renders if only title is present', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productTitle: 'Just a title'
                }
            };

            serializer.serialize(card.render(opts)).should.not.equal('');
        });

        it('renders if only description is present', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productTitle: 'Just a description'
                }
            };

            serializer.serialize(card.render(opts)).should.not.equal('');
        });

        it('renders if only button is present', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButtonEnabled: true,
                    productButton: 'Just a button',
                    productUrl: 'https://example.com/product'
                }
            };

            serializer.serialize(card.render(opts)).should.not.equal('');
        });
    });

    describe('image dimensions', function () {
        it('includes width and height when available', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButton: 'Click me',
                    productButtonEnabled: true,
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2022/06/product.png',
                    productImageWidth: 3000,
                    productImageHeight: 6000,
                    productRatingEnabled: true,
                    productStarRating: 3,
                    productTitle: 'Product title!',
                    productUrl: 'https://example.com/product/ok'
                }
            };

            serializer.serialize(card.render(opts))
                .should.containEql('width="3000" height="6000"');
        });

        it('omits width and height when not available', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButton: 'Click me',
                    productButtonEnabled: true,
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2022/06/product.png',
                    // productImageWidth: '2000',
                    // productImageHeight: '1000',
                    productRatingEnabled: true,
                    productStarRating: 3,
                    productTitle: 'Product title!',
                    productUrl: 'https://example.com/product/ok'
                }
            };

            const output = serializer.serialize(card.render(opts));

            output.should.not.containEql('width="');
            output.should.not.containEql('height="');
        });

        it('uses resized width and height when there\'s a max width', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2022/06/product.png',
                    productImageWidth: 3000,
                    productImageHeight: 6000
                },
                options: {
                    imageOptimization: {
                        defaultMaxWidth: 2000
                    },
                    canTransformImage: () => true
                }
            };

            serializer.serialize(card.render(opts))
                .should.containEql('width="2000" height="4000"');
        });

        it('uses original width and height when transform is not available', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2021/02/four-point-oh.png',
                    productImageWidth: 3000,
                    productImageHeight: 6000
                },
                options: {
                    imageOptimization: {
                        defaultMaxWidth: 2000
                    },
                    canTransformImage: () => false
                }
            };

            serializer.serialize(card.render(opts))
                .should.containEql('width="3000" height="6000"');
        });
    });

    describe('srcset attribute', function () {
        it('is included when src is relative', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 6000
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

            serializer.serialize(card.render(opts))
                .should.containEql('srcset="/content/images/size/w600/2020/06/image.png 600w, /content/images/size/w1000/2020/06/image.png 1000w, /content/images/size/w1600/2020/06/image.png 1600w, /content/images/size/w2400/2020/06/image.png 2400w"');
        });

        it('is included when src is __GHOST_URL__ relative', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '__GHOST_URL__/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 6000
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

            serializer.serialize(card.render(opts))
                .should.containEql('srcset="__GHOST_URL__/content/images/size/w600/2020/06/image.png 600w, __GHOST_URL__/content/images/size/w1000/2020/06/image.png 1000w, __GHOST_URL__/content/images/size/w1600/2020/06/image.png 1600w, __GHOST_URL__/content/images/size/w2400/2020/06/image.png 2400w"');
        });

        it('is included for absolute images', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://localhost:2368/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
                },
                options: {
                    siteUrl: 'https://localhost:2368',
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

            serializer.serialize(card.render(opts))
                .should.containEql('srcset="https://localhost:2368/content/images/size/w600/2020/06/image.png 600w, https://localhost:2368/content/images/size/w1000/2020/06/image.png 1000w, https://localhost:2368/content/images/size/w1600/2020/06/image.png 1600w, https://localhost:2368/content/images/size/w2400/2020/06/image.png 2400w"');
        });

        it('is included for absolute images when siteUrl has trailing slash', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://localhost:2368/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
                },
                options: {
                    siteUrl: 'https://localhost:2368/',
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

            serializer.serialize(card.render(opts))
                .should.containEql('srcset="https://localhost:2368/content/images/size/w600/2020/06/image.png 600w, https://localhost:2368/content/images/size/w1000/2020/06/image.png 1000w, https://localhost:2368/content/images/size/w1600/2020/06/image.png 1600w, https://localhost:2368/content/images/size/w2400/2020/06/image.png 2400w"');
        });

        it('is omitted when target === email', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 6000
                },
                options: {
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
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 6000
                },
                options: {}
            };

            serializer.serialize(card.render(opts))
                .should.not.containEql('srcset=');
        });

        it('is omitted when `srcsets: false` is passed in as an option', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    src: '/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
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

        it('is omitted when canTransformImages is provided and returns false', function () {
            const canTransformImage = () => false;

            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
                },
                options: {
                    imageOptimization: {
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    },
                    canTransformImage
                }
            };

            serializer.serialize(card.render(opts))
                .should.not.containEql('srcset=');
        });

        it('is omitted when no width is provided', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageHeight: 2000
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

            serializer.serialize(card.render(opts))
                .should.not.containEql('srcset=');
        });

        it('is omitted when image is smaller than minimum responsive width', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 500,
                    productImageHeight: 700
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

            serializer.serialize(card.render(opts))
                .should.not.containEql('srcset=');
        });

        it('omits sizes larger than image width and includes original image width if smaller than largest responsive width', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 750,
                    productImageHeight: 300
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

            serializer.serialize(card.render(opts))
                .should.containEql('srcset="/content/images/size/w600/2020/06/image.png 600w, /content/images/2020/06/image.png 750w"');
        });

        it('works correctly with subdirectories', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/subdir/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 6000
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

            serializer.serialize(card.render(opts))
                .should.containEql('srcset="/subdir/content/images/size/w600/2020/06/image.png 600w, /subdir/content/images/size/w1000/2020/06/image.png 1000w, /subdir/content/images/size/w1600/2020/06/image.png 1600w, /subdir/content/images/size/w2400/2020/06/image.png 2400w"');
        });

        it('works correctly for absolute subdirectories', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://localhost:2368/blog/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
                },
                options: {
                    siteUrl: 'https://localhost:2368/blog',
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

            serializer.serialize(card.render(opts))
                .should.containEql('srcset="https://localhost:2368/blog/content/images/size/w600/2020/06/image.png 600w, https://localhost:2368/blog/content/images/size/w1000/2020/06/image.png 1000w, https://localhost:2368/blog/content/images/size/w1600/2020/06/image.png 1600w, https://localhost:2368/blog/content/images/size/w2400/2020/06/image.png 2400w"');
        });

        it('is included when src is an Unsplash image', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ',
                    productImageWidth: 3000,
                    productImageHeight: 6000
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

            // note that '&' in URLs will be rendered as '&amp;' to maintain HTML encoding
            serializer.serialize(card.render(opts))
                .should.containEql('srcset="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1000w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2400&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 2400w"');
        });

        it('has same size omission behaviour for Unsplash as local files', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ',
                    productImageWidth: 750,
                    productImageHeight: 300
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

            serializer.serialize(card.render(opts))
                .should.containEql('srcset="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=750&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 750w"');
        });
    });

    describe('sizes attribute', function () {
        it('is added for standard images', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2022/06/product.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
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

            serializer.serialize(card.render(opts))
                .should.containEql('sizes="(min-width: 720px) 720px"');
        });

        it('is added for __GHOST_URL__ relative images', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '__GHOST_URL__/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
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

            serializer.serialize(card.render(opts))
                .should.containEql('sizes="(min-width: 720px) 720px"');
        });

        it('is added for absolute images', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://localhost:2368/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
                },
                options: {
                    siteUrl: 'https://localhost:2368',
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

            serializer.serialize(card.render(opts))
                .should.match(/sizes="\(min-width: 720px\) 720px"/);
        });

        it('is added for absolute images when siteUrl has trailing slash', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://localhost:2368/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
                },
                options: {
                    siteUrl: 'https://localhost:2368/',
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

            serializer.serialize(card.render(opts))
                .should.containEql('sizes="(min-width: 720px) 720px"');
        });

        it('is omitted when srcset is not added', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
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
                .should.not.containEql('sizes="');

            // sanity check
            serializer.serialize(card.render(opts))
                .should.containEql('/content/images/2020/06/image.png');
        });

        it('is omitted when width is missing', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    // productImageWidth: 3000,
                    productImageHeight: 2000
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

            serializer.serialize(card.render(opts))
                .should.not.containEql('sizes="');

            // sanity check
            serializer.serialize(card.render(opts))
                .should.containEql('/content/images/2020/06/image.png');
        });

        it('is included when only height is missing', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 3000
                    // productImageHeight: 2000
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

            serializer.serialize(card.render(opts))
                .should.containEql('sizes="(min-width: 720px) 720px"');
        });

        it('is omitted for standard images when width is less than 720', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 640,
                    productImageHeight: 480
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

            serializer.serialize(card.render(opts)).should.not.match(/sizes="/);

            // sanity check
            serializer.serialize(card.render(opts))
                .should.containEql('/content/images/2020/06/image.png');
        });
    });

    describe('email render', function () {
        it('generates an email-friendly product card', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButton: 'Click me',
                    productButtonEnabled: true,
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://example.com/images/ok.jpg',
                    productRatingEnabled: true,
                    productStarRating: 3,
                    productTitle: 'Product title!',
                    productUrl: 'https://example.com/product/ok'
                },
                options: {
                    target: 'email'
                }
            };

            const html = `<table cellspacing="0" cellpadding="0" border="0" class="kg-product-card"><tr><td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><img src="https://example.com/images/ok.jpg" style="height: auto; border: none; padding-bottom: 16px;" border="0"></td></tr><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><td valign="top" class="kg-product-rating"><img src="https://static.ghost.org/v4.0.0/images/star-rating-darkmode-3.png" border="0" class="is-dark-background"><img src="https://static.ghost.org/v4.0.0/images/star-rating-3.png" border="0" class="is-light-background"></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div class="btn btn-accent" style="box-sizing: border-box;display: table;width: 100%;padding-top: 16px;"><a href="https://example.com/product/ok" style="overflow-wrap: anywhere;border: solid 1px;border-radius: 5px;box-sizing: border-box;cursor: pointer;display: inline-block;font-size: 14px;font-weight: bold;margin: 0;padding: 12px 25px;text-decoration: none;color: #FFFFFF; width: 100%; text-align: center;">Click me</a></div></td></tr></table>`;

            serializer.serialize(card.render(opts)).should.equal(html);
        });

        it('generates the same card when the star-rating is disabled', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButton: 'Click me',
                    productButtonEnabled: true,
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://example.com/images/ok.jpg',
                    productRatingEnabled: false,
                    productTitle: 'Product title!',
                    productUrl: 'https://example.com/product/ok'
                },
                options: {
                    target: 'email'
                }
            };

            const html = `<table cellspacing="0" cellpadding="0" border="0" class="kg-product-card"><tr><td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><img src="https://example.com/images/ok.jpg" style="height: auto; border: none; padding-bottom: 16px;" border="0"></td></tr><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div class="btn btn-accent" style="box-sizing: border-box;display: table;width: 100%;padding-top: 16px;"><a href="https://example.com/product/ok" style="overflow-wrap: anywhere;border: solid 1px;border-radius: 5px;box-sizing: border-box;cursor: pointer;display: inline-block;font-size: 14px;font-weight: bold;margin: 0;padding: 12px 25px;text-decoration: none;color: #FFFFFF; width: 100%; text-align: center;">Click me</a></div></td></tr></table>`;

            serializer.serialize(card.render(opts)).should.equal(html);
        });

        it('allows disabling the button', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButtonEnabled: false,
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://example.com/images/ok.jpg',
                    productRatingEnabled: false,
                    productTitle: 'Product title!'
                },
                options: {
                    target: 'email'
                }
            };

            const html = `<table cellspacing="0" cellpadding="0" border="0" class="kg-product-card"><tr><td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><img src="https://example.com/images/ok.jpg" style="height: auto; border: none; padding-bottom: 16px;" border="0"></td></tr><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr></table>`;

            serializer.serialize(card.render(opts)).should.equal(html);
        });

        it('renders without an image if the attribute isn\'t there', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButtonEnabled: false,
                    productDescription: 'This product is ok',
                    productRatingEnabled: false,
                    productTitle: 'Product title!'
                },
                options: {
                    target: 'email'
                }
            };

            const html = `<table cellspacing="0" cellpadding="0" border="0" class="kg-product-card"><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr></table>`;

            serializer.serialize(card.render(opts)).should.equal(html);
        });

        it('adds image width/height and uses resized local image', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
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

            output.should.match(/width="600"/);
            output.should.match(/height="400"/);
            output.should.match(/\/content\/images\/size\/w1600\/2020\/06\/image\.png/);
        });

        it('adds image width/height and uses resized unsplash image', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://images.unsplash.com/test.jpg',
                    productImageWidth: 3000,
                    productImageHeight: 2000
                },
                options: {
                    target: 'email'
                }
            };

            const output = serializer.serialize(card.render(opts));

            output.should.match(/width="600"/);
            output.should.match(/height="400"/);
            output.should.match(/images\.unsplash\.com\/test\.jpg\?w=1200/);
        });

        it('adds image width/height and uses original src when local image can\'t be transformed', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 3000,
                    productImageHeight: 2000
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

            output.should.match(/width="600"/);
            output.should.match(/height="400"/);
            output.should.match(/\/content\/images\/2020\/06\/image\.png/);
            output.should.not.match(/\/content\/images\/size\/w1600\/2020\/06\/image\.png/);
        });

        it('uses original image src if size is smaller than "retina" size', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 800,
                    productImageHeight: 533
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

            output.should.match(/width="600"/);
            output.should.match(/height="400"/);
            output.should.match(/\/content\/images\/2020\/06\/image\.png/);
        });

        it('uses original image width/height if image is smaller than 600px wide', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png',
                    productImageWidth: 450,
                    productImageHeight: 300
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

            output.should.match(/width="450"/);
            output.should.match(/height="300"/);
            output.should.match(/\/content\/images\/2020\/06\/image\.png/);
        });

        it('skips image width/height and resize if payload is missing dimensions', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: '/content/images/2020/06/image.png'
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

            output.should.not.match(/width="/);
            output.should.not.match(/height="/);
            output.should.match(/\/content\/images\/2020\/06\/image\.png/);
        });

        it('resizes Unsplash images even if width/height data is missing', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    productTitle: 'Product title!',
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://images.unsplash.com/test.jpg'
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

            output.should.match(/test\.jpg\?w=1200/);
        });
    });

    it('transforms product urls absolute to relative', function () {
        let payload = {
            productButton: 'Click me',
            productButtonEnabled: false,
            productDescription: '<a href="https://ghost.org/">Home</a>',
            productRatingEnabled: false,
            productImageSrc: 'https://ghost.org/',
            productTitle: '<a href="https://ghost.org/">Home</a>',
            productUrl: 'https://ghost.org/'
        };

        const transformed = card.absoluteToRelative(payload, {siteUrl: 'https://ghost.org'});

        transformed.productTitle.should.equal('<a href="/">Home</a>');
        transformed.productDescription.should.equal('<a href="/">Home</a>');
        transformed.productUrl.should.equal('/');
        transformed.productImageSrc.should.equal('/');
    });

    it('transforms product urls relative to absolute', function () {
        let payload = {
            productButton: 'Click me',
            productButtonEnabled: false,
            productDescription: '<a href="/">Home</a>',
            productRatingEnabled: false,
            productImageSrc: '/',
            productTitle: '<a href="/">Home</a>',
            productUrl: '/'
        };

        const transformed = card.relativeToAbsolute(payload, {siteUrl: 'https://ghost.org'});

        transformed.productTitle.should.equal('<a href="https://ghost.org/">Home</a>');
        transformed.productDescription.should.equal('<a href="https://ghost.org/">Home</a>');
        transformed.productUrl.should.equal('https://ghost.org/');
        transformed.productImageSrc.should.equal('https://ghost.org/');
    });

    it('transforms product urls to transform ready', function () {
        let payload = {
            productButton: 'Click me',
            productButtonEnabled: false,
            productDescription: '<a href="/">Home</a>',
            productRatingEnabled: false,
            productImageSrc: '/',
            productTitle: '<a href="/">Home</a>',
            productUrl: '/'
        };

        const transformed = card.toTransformReady(payload, {siteUrl: 'https://ghost.org'});

        transformed.productTitle.should.equal('<a href="__GHOST_URL__/">Home</a>');
        transformed.productDescription.should.equal('<a href="__GHOST_URL__/">Home</a>');
        transformed.productUrl.should.equal('__GHOST_URL__/');
        transformed.productImageSrc.should.equal('__GHOST_URL__/');
    });
});
