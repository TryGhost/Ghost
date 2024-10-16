const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../utils/configUtils');

// Stuff we are testing
const img_url = require('../../../../core/frontend/helpers/img_url');

const logging = require('@tryghost/logging');

describe('{{img_url}} helper', function () {
    let logWarnStub;

    beforeEach(function () {
        logWarnStub = sinon.stub(logging, 'warn');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('without sub-directory', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/'});
        });

        after(async function () {
            await configUtils.restore();
        });

        it('should output relative url of image', function () {
            const rendered = img_url('/content/images/image-relative-url.png', {});
            should.exist(rendered);
            rendered.should.equal('/content/images/image-relative-url.png');
            logWarnStub.called.should.be.false();
        });

        it('should output relative url of image if the input is absolute', function () {
            const rendered = img_url('http://localhost:65535/content/images/image-relative-url.png', {});
            should.exist(rendered);
            rendered.should.equal('/content/images/image-relative-url.png');
            logWarnStub.called.should.be.false();
        });

        it('should output absolute url of image if the option is present ', function () {
            const rendered = img_url('/content/images/image-relative-url.png', {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.should.equal('http://localhost:65535/content/images/image-relative-url.png');
            logWarnStub.called.should.be.false();
        });

        it('should NOT output absolute url of image if the option is "false" ', function () {
            const rendered = img_url('/content/images/image-relative-url.png', {hash: {absolute: 'false'}});
            should.exist(rendered);
            rendered.should.equal('/content/images/image-relative-url.png');
        });

        it('should output author url', function () {
            const rendered = img_url('/content/images/author-image-relative-url.png', {});
            should.exist(rendered);
            rendered.should.equal('/content/images/author-image-relative-url.png');
            logWarnStub.called.should.be.false();
        });

        it('should have no output if the image attribute is not provided (with warning)', function () {
            const rendered = img_url({hash: {absolute: 'true'}});
            should.not.exist(rendered);
            logWarnStub.calledOnce.should.be.true();
        });

        it('should have no output if the image attribute evaluates to undefined (with warning)', function () {
            const rendered = img_url(undefined, {hash: {absolute: 'true'}});
            should.not.exist(rendered);
            logWarnStub.calledOnce.should.be.true();
        });

        it('should have no output if the image attribute evaluates to null (no waring)', function () {
            const rendered = img_url(null, {hash: {absolute: 'true'}});
            should.not.exist(rendered);
            logWarnStub.calledOnce.should.be.false();
        });
    });

    describe('with sub-directory', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/blog'});
        });

        after(async function () {
            await configUtils.restore();
        });

        it('should output relative url of image', function () {
            const rendered = img_url('/blog/content/images/image-relative-url.png', {});
            should.exist(rendered);
            rendered.should.equal('/blog/content/images/image-relative-url.png');
        });

        it('should output absolute url of image if the option is present ', function () {
            const rendered = img_url('/blog/content/images/image-relative-url.png', {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.should.equal('http://localhost:65535/blog/content/images/image-relative-url.png');
        });

        it('should not change output for an external url', function () {
            const rendered = img_url('http://example.com/picture.jpg', {});
            should.exist(rendered);
            rendered.should.equal('http://example.com/picture.jpg');
        });
    });

    describe('image_sizes', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/'});
        });

        after(async function () {
            await configUtils.restore();
        });

        it('should output correct url for absolute paths which are internal', function () {
            const rendered = img_url('http://localhost:65535/content/images/my-coole-img.jpg', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('/content/images/size/w400/my-coole-img.jpg');
        });

        it('should output the correct url for protocol relative urls', function () {
            const rendered = img_url('//website.com/whatever/my-coole-img.jpg', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('//website.com/whatever/my-coole-img.jpg');
        });

        it('should output the correct url for relative paths', function () {
            const rendered = img_url('/content/images/my-coole-img.jpg', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('/content/images/size/w400/my-coole-img.jpg');
        });

        it('should output the correct url for relative paths without leading slash', function () {
            const rendered = img_url('content/images/my-coole-img.jpg', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('content/images/size/w400/my-coole-img.jpg');
        });

        it('ignores invalid size options', function () {
            const rendered = img_url('/content/images/author-image-relative-url.png', {hash: {size: 'invalid-size'}});
            should.exist(rendered);
            rendered.should.equal('/content/images/author-image-relative-url.png');
            logWarnStub.called.should.be.false();
        });

        it('ignores misconfigured sizes', function () {
            const rendered = img_url('/content/images/author-image-relative-url.png', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {typo: 600}
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('/content/images/author-image-relative-url.png');
            logWarnStub.called.should.be.false();
        });

        it('ignores format if size is missing', function () {
            const rendered = img_url('/content/images/author-image-relative-url.png', {
                hash: {
                    format: 'webp'
                },
                data: {
                    config: {
                        image_sizes: {
                            w600: {width: 600}
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('/content/images/author-image-relative-url.png');
            logWarnStub.called.should.be.false();
        });

        it('adds format and size options', function () {
            const rendered = img_url('/content/images/author-image-relative-url.png', {
                hash: {
                    size: 'w600',
                    format: 'webp'
                },
                data: {
                    config: {
                        image_sizes: {
                            w600: {width: 600}
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('/content/images/size/w600/format/webp/author-image-relative-url.png');
            logWarnStub.called.should.be.false();
        });

        it('ignores invalid formats', function () {
            const rendered = img_url('/content/images/author-image-relative-url.png', {
                hash: {
                    size: 'w600',
                    format: 'invalid'
                },
                data: {
                    config: {
                        image_sizes: {
                            w600: {width: 600}
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('/content/images/size/w600/author-image-relative-url.png');
            logWarnStub.called.should.be.false();
        });
    });

    describe('Unsplash', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/'});
        });

        after(async function () {
            await configUtils.restore();
        });

        it('works without size option', function () {
            const rendered = img_url('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000', {
                hash: {},
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000');
        });

        it('can change the output width', function () {
            const rendered = img_url('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=400');
        });

        it('can change the output height', function () {
            const rendered = img_url('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                height: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&h=400');
        });

        it('ignores invalid image size configurations', function () {
            const rendered = img_url('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80', {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                typo: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80');
        });

        it('ignores invalid urls', function () {
            const invalid = ':https://images.unsplash.com/test';
            const rendered = img_url(invalid, {
                hash: {
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal(invalid);
        });

        it('ignores invalid sizes', function () {
            const rendered = img_url('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000', {
                hash: {
                    size: 'invalid'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000');
        });

        it('can change the output format', function () {
            const rendered = img_url('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000', {
                hash: {
                    format: 'webp'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=webp&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000');
        });

        it('ignores invalid formats', function () {
            const rendered = img_url('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000', {
                hash: {
                    format: 'invalid'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000');
        });

        it('transforms jpeg to jpg', function () {
            const rendered = img_url('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=auto&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000', {
                hash: {
                    format: 'jpeg'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000');
        });

        it('can change the output format and size', function () {
            const rendered = img_url('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000', {
                hash: {
                    format: 'webp',
                    size: 'medium'
                },
                data: {
                    config: {
                        image_sizes: {
                            medium: {
                                width: 400
                            }
                        }
                    }
                }
            });
            should.exist(rendered);
            rendered.should.equal('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=webp&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=400');
        });
    });
});
