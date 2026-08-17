import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Controller: application', function () {
    setupTest();

    describe('showUpdateBanner', function () {
        it('returns true when all conditions are met', function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: true,
                        url: 'https://update.example.com'
                    }
                },
                version: '5.1.0'
            };

            expect(controller.showUpdateBanner).to.be.true;
        });

        it('returns false when update is not enabled', function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: false,
                        url: 'https://update.example.com'
                    }
                },
                version: '5.1.0'
            };

            expect(controller.showUpdateBanner).to.be.false;
        });

        it('returns false when update URL is not provided', function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: true,
                        url: null
                    }
                },
                version: '5.1.0'
            };

            expect(!!controller.showUpdateBanner).to.be.false;
        });

        it('returns false when version does not start with "5."', function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: true,
                        url: 'https://update.example.com'
                    }
                },
                version: '4.9.0'
            };

            expect(controller.showUpdateBanner).to.be.false;
        });

        it('returns false when hostSettings is null', function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: null,
                version: '5.1.0'
            };

            expect(!!controller.showUpdateBanner).to.be.false;
        });

        it('returns false when hostSettings.update is null', function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: null
                },
                version: '5.1.0'
            };

            expect(!!controller.showUpdateBanner).to.be.false;
        });

        it('handles version starting with "5." correctly', function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: true,
                        url: 'https://update.example.com'
                    }
                },
                version: '5.0.0-alpha.1'
            };

            expect(controller.showUpdateBanner).to.be.true;
        });
    });

    describe('openUpdateTab', function () {
        let mockWindow;
        let originalWindowOpen;

        beforeEach(function () {
            // Mock window.open
            mockWindow = {
                document: {
                    write: sinon.stub()
                },
                location: {}
            };
            originalWindowOpen = window.open;
            window.open = sinon.stub().returns(mockWindow);
        });

        afterEach(function () {
            window.open = originalWindowOpen;
        });

        it('returns early when showUpdateBanner is false', async function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: false,
                        url: 'https://update.example.com'
                    }
                },
                version: '5.1.0'
            };

            await controller.openUpdateTab();

            expect(window.open.called).to.be.false;
        });

        it('opens update tab successfully with JWT token', async function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: true,
                        url: 'https://update.example.com'
                    }
                },
                version: '5.1.0'
            };

            controller.ghostPaths = {
                url: {
                    api: sinon.stub().withArgs('identities').returns('/ghost/api/identities')
                }
            };

            controller.ajax = {
                request: sinon.stub().resolves({
                    identities: [{
                        token: 'mock-jwt-token'
                    }]
                })
            };

            await controller.openUpdateTab();

            expect(window.open.calledWith('', '_blank')).to.be.true;
            expect(mockWindow.document.write.calledWith('Loading...')).to.be.true;
            expect(controller.ajax.request.calledWith('/ghost/api/identities')).to.be.true;
            expect(mockWindow.location.href).to.equal('https://update.example.com/?jwt=mock-jwt-token');
        });

        it('handles missing token in response', async function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: true,
                        url: 'https://update.example.com'
                    }
                },
                version: '5.1.0'
            };

            controller.ghostPaths = {
                url: {
                    api: sinon.stub().withArgs('identities').returns('/ghost/api/identities')
                }
            };

            controller.ajax = {
                request: sinon.stub().resolves({
                    identities: []
                })
            };

            await controller.openUpdateTab();

            expect(window.open.calledWith('', '_blank')).to.be.true;
            expect(mockWindow.document.write.calledWith('Loading...')).to.be.true;
            expect(mockWindow.document.write.calledWith('Error: Unable to load update page')).to.be.true;
            expect(mockWindow.location.href).to.be.undefined;
        });

        it('handles null identities in response', async function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: true,
                        url: 'https://update.example.com'
                    }
                },
                version: '5.1.0'
            };

            controller.ghostPaths = {
                url: {
                    api: sinon.stub().withArgs('identities').returns('/ghost/api/identities')
                }
            };

            controller.ajax = {
                request: sinon.stub().resolves({
                    identities: null
                })
            };

            await controller.openUpdateTab();

            expect(mockWindow.document.write.calledWith('Error: Unable to load update page')).to.be.true;
        });

        it('handles AJAX request error', async function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: true,
                        url: 'https://update.example.com'
                    }
                },
                version: '5.1.0'
            };

            controller.ghostPaths = {
                url: {
                    api: sinon.stub().withArgs('identities').returns('/ghost/api/identities')
                }
            };

            controller.ajax = {
                request: sinon.stub().rejects(new Error('Network error'))
            };

            await controller.openUpdateTab();

            expect(window.open.calledWith('', '_blank')).to.be.true;
            expect(mockWindow.document.write.calledWith('Loading...')).to.be.true;
            expect(mockWindow.document.write.calledWith('Error: Unable to load update page')).to.be.true;
            expect(mockWindow.location.href).to.be.undefined;
        });

        it('correctly appends JWT token to URL with existing query parameters', async function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: true,
                        url: 'https://update.example.com?existing=param'
                    }
                },
                version: '5.1.0'
            };

            controller.ghostPaths = {
                url: {
                    api: sinon.stub().withArgs('identities').returns('/ghost/api/identities')
                }
            };

            controller.ajax = {
                request: sinon.stub().resolves({
                    identities: [{
                        token: 'test-token-123'
                    }]
                })
            };

            await controller.openUpdateTab();

            expect(mockWindow.location.href).to.equal('https://update.example.com/?existing=param&jwt=test-token-123');
        });

        it('handles empty response object', async function () {
            const controller = this.owner.lookup('controller:application');

            controller.config = {
                hostSettings: {
                    update: {
                        enabled: true,
                        url: 'https://update.example.com'
                    }
                },
                version: '5.1.0'
            };

            controller.ghostPaths = {
                url: {
                    api: sinon.stub().withArgs('identities').returns('/ghost/api/identities')
                }
            };

            controller.ajax = {
                request: sinon.stub().resolves({})
            };

            await controller.openUpdateTab();

            expect(mockWindow.document.write.calledWith('Error: Unable to load update page')).to.be.true;
        });
    });

    describe('ownerUserNameOrEmail', function () {
        it('returns user name when user exists with name', function () {
            const controller = this.owner.lookup('controller:application');
            const mockUser = {
                name: 'John Doe',
                email: 'john@example.com',
                isOwnerOnly: true
            };

            controller.store = {
                peekAll: sinon.stub().withArgs('user').returns({
                    findBy: sinon.stub().withArgs('isOwnerOnly', true).returns(mockUser)
                })
            };

            expect(controller.ownerUserNameOrEmail).to.equal('John Doe');
        });

        it('returns user email when user exists with email but no name', function () {
            const controller = this.owner.lookup('controller:application');
            const mockUser = {
                name: null,
                email: 'john@example.com',
                isOwnerOnly: true
            };

            controller.store = {
                peekAll: sinon.stub().withArgs('user').returns({
                    findBy: sinon.stub().withArgs('isOwnerOnly', true).returns(mockUser)
                })
            };

            expect(controller.ownerUserNameOrEmail).to.equal('john@example.com');
        });

        it('returns user email when user exists with empty name', function () {
            const controller = this.owner.lookup('controller:application');
            const mockUser = {
                name: '',
                email: 'john@example.com',
                isOwnerOnly: true
            };

            controller.store = {
                peekAll: sinon.stub().withArgs('user').returns({
                    findBy: sinon.stub().withArgs('isOwnerOnly', true).returns(mockUser)
                })
            };

            expect(controller.ownerUserNameOrEmail).to.equal('john@example.com');
        });

        it('prioritizes name over email when both are available', function () {
            const controller = this.owner.lookup('controller:application');
            const mockUser = {
                name: 'John Doe',
                email: 'john@example.com',
                isOwnerOnly: true
            };

            controller.store = {
                peekAll: sinon.stub().withArgs('user').returns({
                    findBy: sinon.stub().withArgs('isOwnerOnly', true).returns(mockUser)
                })
            };

            expect(controller.ownerUserNameOrEmail).to.equal('John Doe');
        });

        it('returns null when user exists but has neither name nor email', function () {
            const controller = this.owner.lookup('controller:application');
            const mockUser = {
                name: null,
                email: null,
                isOwnerOnly: true
            };

            controller.store = {
                peekAll: sinon.stub().withArgs('user').returns({
                    findBy: sinon.stub().withArgs('isOwnerOnly', true).returns(mockUser)
                })
            };

            expect(controller.ownerUserNameOrEmail).to.be.null;
        });

        it('returns null when user exists but has empty name and email', function () {
            const controller = this.owner.lookup('controller:application');
            const mockUser = {
                name: '',
                email: '',
                isOwnerOnly: true
            };

            controller.store = {
                peekAll: sinon.stub().withArgs('user').returns({
                    findBy: sinon.stub().withArgs('isOwnerOnly', true).returns(mockUser)
                })
            };

            expect(controller.ownerUserNameOrEmail).to.be.null;
        });

        it('returns null when no owner user exists', function () {
            const controller = this.owner.lookup('controller:application');

            controller.store = {
                peekAll: sinon.stub().withArgs('user').returns({
                    findBy: sinon.stub().withArgs('isOwnerOnly', true).returns(null)
                })
            };

            expect(controller.ownerUserNameOrEmail).to.be.null;
        });

        it('returns null when findBy returns undefined', function () {
            const controller = this.owner.lookup('controller:application');

            controller.store = {
                peekAll: sinon.stub().withArgs('user').returns({
                    findBy: sinon.stub().withArgs('isOwnerOnly', true).returns(undefined)
                })
            };

            expect(controller.ownerUserNameOrEmail).to.be.null;
        });
    });
});
