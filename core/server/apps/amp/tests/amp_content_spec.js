var should         = require('should'),
    rewire         = require('rewire'),
    configUtils    = require('../../../../test/utils/configUtils'),

// Stuff we are testing
    ampContentHelper    = rewire('../lib/helpers/amp_content');

// TODO: Amperize really needs to get stubbed, so we can test returning errors
// properly and make this test faster!
describe('{{amp_content}} helper', function () {
    afterEach(function () {
        ampContentHelper.__set__('amperizeCache', {});
    });

    it('can render content', function (done) {
        var testData = {
                html: 'Hello World',
                updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                id: 1
            },
            ampResult = ampContentHelper.call(testData);

        ampResult.then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal(testData.html);
            done();
        }).catch(done);
    });

    it('returns if no html is provided', function (done) {
        var testData = {
                updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                id: 1
            },
            ampResult = ampContentHelper.call(testData);

        ampResult.then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.be.equal('');
            done();
        }).catch(done);
    });

    describe('Cache', function () {
        it('can render content from cache', function (done) {
            var testData = {
                    html: 'Hello World',
                    updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                    id: 1
                },
                ampCachedResult,
                ampResult = ampContentHelper.call(testData),
                amperizeCache = ampContentHelper.__get__('amperizeCache');

            ampResult.then(function (rendered) {
                should.exist(rendered);
                should.exist(amperizeCache);
                rendered.string.should.equal(testData.html);
                amperizeCache[1].should.have.property('updated_at', 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)');
                amperizeCache[1].should.have.property('amp', testData.html);
                // call it again, to make it fetch from cache
                ampCachedResult = ampContentHelper.call(testData);
                ampCachedResult.then(function (rendered) {
                    should.exist(rendered);
                    should.exist(amperizeCache);
                    amperizeCache[1].should.have.property('updated_at', 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)');
                    amperizeCache[1].should.have.property('amp', testData.html);
                    done();
                });
            }).catch(done);
        });

        it('fetches new AMP HTML if post was changed', function (done) {
            var testData1 = {
                    html: 'Hello World',
                    updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                    id: 1
                },
                testData2 = {
                        html: 'Hello Ghost',
                        updated_at: 'Wed Jul 30 2016 18:17:22 GMT+0200 (CEST)',
                        id: 1
                    },
                ampResult = ampContentHelper.call(testData1),
                amperizeCache = ampContentHelper.__get__('amperizeCache');

            ampResult.then(function (rendered) {
                should.exist(rendered);
                should.exist(amperizeCache);
                rendered.string.should.equal(testData1.html);
                amperizeCache[1].should.have.property('updated_at', 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)');
                amperizeCache[1].should.have.property('amp', testData1.html);

                // call it again with different values to fetch from Amperize and not from cache
                ampResult = ampContentHelper.call(testData2);
                ampResult.then(function (rendered) {
                    should.exist(rendered);
                    should.exist(amperizeCache);

                    // it should not have the old value,
                    amperizeCache[1].should.not.have.property('Wed Jul 30 2016 18:17:22 GMT+0200 (CEST)');
                    // only the new one
                    rendered.string.should.equal(testData2.html);
                    amperizeCache[1].should.have.property('updated_at', 'Wed Jul 30 2016 18:17:22 GMT+0200 (CEST)');
                    amperizeCache[1].should.have.property('amp', testData2.html);
                    done();
                });
            }).catch(done);
        });
    });

    describe('Transforms and sanitizes HTML', function () {
        beforeEach(function () {
            configUtils.set({url: 'https://blog.ghost.org/'});
        });

        afterEach(function () {
            ampContentHelper.__set__('amperizeCache', {});
            configUtils.restore();
        });

        it('can transform img tags to amp-img', function (done) {
            var testData = {
                    html: '<img src="/content/images/2016/08/scheduled2-1.jpg" alt="The Ghost Logo" />',
                    updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                    id: 1
                },
                expectedResult = '<amp-img src="https://blog.ghost.org/content/images/2016/08/scheduled2-1.jpg" alt="The Ghost Logo" width="1000" height="281" layout="responsive"></amp-img>',
                ampResult = ampContentHelper.call(testData);

            ampResult.then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal(expectedResult);
                done();
            }).catch(done);
        });

        it('can transform audio tags to amp-audio', function (done) {
            var testData = {
                    html: '<audio controls="controls" width="auto" height="50" autoplay="mobile">Your browser does not support the <code>audio</code> element.<source src="https://audio.com/foo.wav" type="audio/wav"></audio>' +
                            '<audio src="http://audio.com/foo.ogg"><track kind="captions" src="http://audio.com/foo.en.vtt" srclang="en" label="English"><source kind="captions" src="http://audio.com/foo.sv.vtt" srclang="sv" label="Svenska"></audio>',
                    updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                    id: 1
                },
                expectedResult = '<amp-audio controls="controls" width="auto" height="50" autoplay="mobile">Your browser does not support the <code>audio</code> element.<source src="https://audio.com/foo.wav" type="audio/wav" /></amp-audio>' +
                                    '<amp-audio src="https://audio.com/foo.ogg"><track kind="captions" src="https://audio.com/foo.en.vtt" srclang="en" label="English" /><source kind="captions" src="https://audio.com/foo.sv.vtt" srclang="sv" label="Svenska" /></amp-audio>',
                ampResult = ampContentHelper.call(testData);

            ampResult.then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal(expectedResult);
                done();
            }).catch(done);
        });

        it('removes video tags including source children', function (done) {
            var testData = {
                    html: '<video width="480" controls poster="https://archive.org/download/WebmVp8Vorbis/webmvp8.gif" >' +
                            '<track kind="captions" src="https://archive.org/download/WebmVp8Vorbis/webmvp8.webm" srclang="en">' +
                            '<source src="https://archive.org/download/WebmVp8Vorbis/webmvp8.webm" type="video/webm">' +
                            '<source src="https://archive.org/download/WebmVp8Vorbis/webmvp8_512kb.mp4" type="video/mp4">' +
                            'Your browser doesn\'t support HTML5 video tag.' +
                            '</video>',
                    updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                    id: 1
                },
                expectedResult = 'Your browser doesn\'t support HTML5 video tag.',
                ampResult = ampContentHelper.call(testData);

            ampResult.then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal(expectedResult);
                done();
            }).catch(done);
        });

        it('removes inline style', function (done) {
            var testData = {
                    html: '<amp-img src="/content/images/2016/08/aileen_small.jpg" style="border-radius: 50%"; !important' +
                          'border="0" align="center" font="Arial" width="50" height="50" layout="responsive"></amp-img>' +
                          '<p align="right" style="color: red; !important" bgcolor="white">Hello</p>' +
                          '<table style="width:100%"><tr bgcolor="tomato" colspan="2"><th font="Arial">Name:</th> ' +
                          '<td color="white" colspan="2">Bill Gates</td></tr><tr><th rowspan="2" valign="center">Telephone:</th> ' +
                          '<td>55577854</td></tr></table>',
                    updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                    id: 1
                },
                expectedResult = '<amp-img src="https://blog.ghost.org/content/images/2016/08/aileen_small.jpg" width="50" ' +
                                 'height="50" layout="responsive"></amp-img><p align="right">Hello</p>' +
                                 '<table><tr bgcolor="tomato"><th>Name:</th> ' +
                                 '<td colspan="2">Bill Gates</td></tr><tr><th rowspan="2" valign="center">Telephone:</th> ' +
                                 '<td>55577854</td></tr></table>',
                ampResult = ampContentHelper.call(testData);

            ampResult.then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal(expectedResult);
                done();
            }).catch(done);
        });

        it('removes prohibited iframe attributes', function (done) {
            var testData = {
                    html: '<iframe src="https://player.vimeo.com/video/180069681?color=ffffff" width="640" height="267" frameborder="0" ' +
                            'webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>',
                    updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                    id: 1
                },
                expectedResult = '<amp-iframe src="https://player.vimeo.com/video/180069681?color=ffffff" width="640" height="267" ' +
                                    'frameborder="0" allowfullscreen sandbox="allow-scripts allow-same-origin" layout="responsive"></amp-iframe>',
                ampResult = ampContentHelper.call(testData);

            ampResult.then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal(expectedResult);
                done();
            }).catch(done);
        });

        it('can handle incomplete HTML tags by returning not Amperized HTML', function (done) {
            var testData = {
                    html: '<img><///img>',
                    updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                    id: 1
                },
                ampResult = ampContentHelper.call(testData),
                sanitizedHTML,
                ampedHTML;

            ampResult.then(function (rendered) {
                sanitizedHTML = ampContentHelper.__get__('cleanHTML');
                ampedHTML = ampContentHelper.__get__('ampHTML');
                should.exist(rendered);
                rendered.string.should.equal('');
                should.exist(ampedHTML);
                ampedHTML.should.be.equal('<img>');
                should.exist(sanitizedHTML);
                sanitizedHTML.should.be.equal('');
                done();
            }).catch(done);
        });

        it('can handle not existing img src by returning not Amperized HTML', function (done) {
            var testData = {
                    html: '<img src="/content/images/does-not-exist.jpg" alt="The Ghost Logo" />',
                    updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                    id: 1
                },
                ampResult = ampContentHelper.call(testData),
                sanitizedHTML,
                ampedHTML;

            ampResult.then(function (rendered) {
                sanitizedHTML = ampContentHelper.__get__('cleanHTML');
                ampedHTML = ampContentHelper.__get__('ampHTML');
                should.exist(rendered);
                rendered.string.should.equal('');
                should.exist(ampedHTML);
                ampedHTML.should.be.equal('<img src="https://blog.ghost.org/content/images/does-not-exist.jpg" alt="The Ghost Logo">');
                should.exist(sanitizedHTML);
                sanitizedHTML.should.be.equal('');
                done();
            }).catch(done);
        });

        it('sanitizes remaining and not valid tags', function (done) {
            var testData = {
                    html: '<form<input type="text" placeholder="Hi AMP tester"></form>' +
                            '<script>some script here</script>' +
                            '<style> h1 {color:red;} p {color:blue;}</style>',
                    updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                    id: 1
                },
                ampResult = ampContentHelper.call(testData);

            ampResult.then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.be.equal('');
                done();
            }).catch(done);
        });
    });
});
