import Analytics from 'ghost-admin/components/posts/analytics';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit: Component: posts/analytics', function () {
    describe('updateLinkData', function () {
        it('Correctly orders `this.links`', function () {
            const instance = Object.create(Analytics.prototype);
            instance.utils = {
                cleanTrackedUrl(url, title) {
                    if (title) {
                        return url.split('//')[1];
                    }
                    return url;
                }
            };

            const links = [{
                id: 1,
                link: {
                    to: 'https://lone.com'
                },
                count: {
                    clicks: 3
                }
            }, {
                id: 2,
                link: {
                    to: 'https://duplicate.com'
                },
                count: {
                    clicks: 2
                }
            }, {
                id: 3,
                link: {
                    to: 'https://duplicate.com'
                },
                count: {
                    clicks: 2
                }
            }];

            instance.updateLinkData(links);

            expect(instance.links.length).to.equal(2);

            expect(instance.links[0].count.clicks).to.equal(4);
            expect(instance.links[0].id).to.equal(2);

            expect(instance.links[1].count.clicks).to.equal(3);
            expect(instance.links[1].id).to.equal(1);
        });

        it('Correctly handles updates to `this.links`', function () {
            const instance = Object.create(Analytics.prototype);
            instance.utils = {
                cleanTrackedUrl(url, title) {
                    if (title) {
                        return url.split('//')[1];
                    }
                    return url;
                }
            };

            const originalLinks = [{
                id: 1,
                link: {
                    to: 'https://lone.com'
                },
                count: {
                    clicks: 1
                }
            }, {
                id: 2,
                link: {
                    to: 'https://duplicate.com'
                },
                count: {
                    clicks: 1
                }
            }, {
                id: 3,
                link: {
                    to: 'https://duplicate.com'
                },
                count: {
                    clicks: 1
                }
            }];

            instance.updateLinkData(originalLinks);

            const updatedLinks = [{
                id: 1,
                link: {
                    to: 'https://lone.com'
                },
                count: {
                    clicks: 1
                }
            }, {
                id: 2,
                link: {
                    to: 'https://duplicate.com'
                },
                count: {
                    clicks: 1
                }
            }, {
                id: 3,
                link: {
                    to: 'https://duplicate.com'
                },
                count: {
                    clicks: 3
                }
            }];

            instance.updateLinkData(updatedLinks);

            expect(instance.links.length).to.equal(2);

            expect(instance.links[0].count.clicks).to.equal(4);
            expect(instance.links[0].id).to.equal(2);

            expect(instance.links[1].count.clicks).to.equal(1);
            expect(instance.links[1].id).to.equal(1);
        });
    });
});
