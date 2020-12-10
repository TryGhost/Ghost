const should = require('should');
const fs = require('fs-extra');
const configUtils = require('../../../utils/configUtils');
const sso = require('../../../../core/server/adapters/sso');
const SSOBase = require('../../../../core/server/adapters/sso/SSOBase');
const SSODefault = require('../../../../core/server/adapters/sso/SSODefault');

const ssoPath = configUtils.config.getContentPath('adapters') + 'sso/';

describe('SSO: index_spec', function () {
    const scope = {adapter: null};

    before(function () {
        if (!fs.existsSync(ssoPath)) {
            fs.mkdirSync(ssoPath);
        }
    });

    afterEach(function () {
        if (scope.adapter) {
            fs.unlinkSync(scope.adapter);
            scope.adapter = null;
        }

        configUtils.restore();
    });

    it('default SSO is the default one', function () {
        const chosenAdapter = sso.getSSO();
        (chosenAdapter instanceof SSOBase).should.eql(true);
        (chosenAdapter instanceof SSODefault).should.eql(true);
        chosenAdapter.getProviders().should.eql([]);
    });

    it('custom adapter', function () {
        scope.adapter = ssoPath + 'custom-adapter.js';
    
        configUtils.set({
            adapters: {
                sso: {
                    active: 'custom-adapter'
                }
            }
        });
    
        const jsFile = '' +
                '\'use strict\';' +
                'var SSOBase = require(\'../../../core/server/adapters/sso/SSOBase\');' +
                'class AnotherAdapter extends SSOBase {' +
                'setupSSOApp(){ return null; }' +
                'getProviders(){ return []; }' +
                '}' +
                'module.exports = AnotherAdapter';

        fs.writeFileSync(scope.adapter, jsFile);
    
        configUtils.config.get('adapters:sso:active').should.eql('custom-adapter');
        const chosenAdapter = sso.getSSO();
        (chosenAdapter instanceof SSODefault).should.eql(false);
        (chosenAdapter instanceof SSOBase).should.eql(true);
    });
    
    it('create bad adapter: exists fn is missing', function () {
        scope.adapter = ssoPath + 'broken-sso.js';
    
        configUtils.set({
            adapters: {
                sso: {
                    active: 'broken-sso'
                }
            }
        });
    
        const jsFile = '' +
                '\'use strict\';' +
                'var SSOBase = require(\'../../../core/server/adapters/sso/SSOBase\');' +
                'class AnotherAdapter extends SSOBase {' +
                'setupSSOApp(){}' +
                '}' +
                'module.exports = AnotherAdapter';
    
        fs.writeFileSync(scope.adapter, jsFile);
    
        try {
            const chosenAdapter = sso.getSSO();
            (chosenAdapter instanceof SSODefault).should.eql(false);
            (chosenAdapter instanceof SSOBase).should.eql(true);
            should.fail('SSO bad adapter should be broken');
        } catch (err) {
            should.exist(err);
            should.equal(err.errorType, 'IncorrectUsageError');
        }
    });
});
