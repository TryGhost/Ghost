import React from 'react';
import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {fillIn, find, render, waitFor, waitUntil} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

let renderedCardConfig;

const MockKoenigComposer = ({cardConfig, children}) => {
    renderedCardConfig = cardConfig;
    return React.createElement(
        React.Fragment,
        null,
        React.createElement('span', {'data-test-visibility-settings': ''}, cardConfig.visibilitySettings),
        React.createElement('span', {'data-test-design-builder': ''}, String(cardConfig.feature.designBuilder)),
        children
    );
};

const MockKoenigEditor = () => {
    return React.createElement('input', {'data-test-editor-state': ''});
};

const MockPlugin = () => null;

const EDITOR_RESOURCE = {
    read() {
        return {
            KoenigComposer: MockKoenigComposer,
            KoenigEditor: MockKoenigEditor,
            TKCountPlugin: MockPlugin,
            WordCountPlugin: MockPlugin
        };
    }
};

const SESSION_USER = {
    isContributor: false
};

class FeatureService extends Service {
    get designBuilder() {
        return true;
    }

    get nightShift() {
        return false;
    }
}

class KoenigService extends Service {
    get resource() {
        return EDITOR_RESOURCE;
    }
}

class SessionService extends Service {
    get user() {
        return SESSION_USER;
    }
}

class SettingsService extends Service {
    get membersSignupAccess() {
        return 'all';
    }

    get title() {
        return 'Test site';
    }
}

class StateBridgeService extends Service {
    artifactRequest;

    requestArtifactBuilder(request) {
        this.artifactRequest = request;
        return Promise.resolve({
            ...request.artifact,
            title: 'Saved calculator',
            html: '<!doctype html><html><head><title>Saved calculator</title></head><body>Saved</body></html>'
        });
    }
}

describe('Integration: Component: koenig-lexical-editor', function () {
    setupRenderingTest();

    beforeEach(function () {
        this.owner.register('config:main', {
            getSiteUrl(path) {
                return `https://example.com${path}`;
            },
            site_uuid: 'test-site-uuid',
            stripeDirect: false
        }, {instantiate: false});

        this.owner.register('service:feature', FeatureService);
        this.owner.register('service:koenig', KoenigService);
        this.owner.register('service:session', SessionService);
        this.owner.register('service:settings', SettingsService);
        this.owner.register('service:state-bridge', StateBridgeService);
        renderedCardConfig = undefined;

        this.set('cardConfig', {
            post: {
                displayName: 'post'
            }
        });
    });

    it('preserves editor state when updated card config re-renders the React root', async function () {
        await render(hbs`<KoenigLexicalEditor @cardConfig={{this.cardConfig}} />`);
        await waitFor('[data-secondary-instance="false"] [data-test-editor-state]');

        const editorSelector = '[data-secondary-instance="false"] [data-test-editor-state]';
        const visibilitySelector = '[data-secondary-instance="false"] [data-test-visibility-settings]';

        expect(find(visibilitySelector)).to.have.text('web and email');

        await fillIn(editorSelector, 'Unsaved editor state');

        this.set('cardConfig', {
            post: {
                displayName: 'page'
            }
        });

        await waitUntil(() => find(visibilitySelector)?.textContent === 'web only');

        expect(find(editorSelector)).to.have.value('Unsaved editor state');
    });

    it('exposes Artifact Builder through the production card capability', async function () {
        await render(hbs`<KoenigLexicalEditor @cardConfig={{this.cardConfig}} />`);
        await waitFor('[data-secondary-instance="false"] [data-test-design-builder]');

        expect(find('[data-secondary-instance="false"] [data-test-design-builder]').textContent).to.equal('true');
        expect(renderedCardConfig.openArtifact).to.be.a('function');

        const artifact = {id: 'artifact-1', artifactVersion: 1, title: '', description: '', html: ''};
        const saved = await renderedCardConfig.openArtifact({nodeKey: 'node-1', artifact});
        const stateBridge = this.owner.lookup('service:state-bridge');

        expect(stateBridge.artifactRequest).to.deep.equal({cardId: 'node-1', artifact});
        expect(saved.title).to.equal('Saved calculator');
    });
});
