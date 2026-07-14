const assert = require('node:assert/strict');
const AnthropicProvider = require('../../../../../../core/server/services/ai/providers/anthropic-provider');
const {getProviderClass, getSupportedProviderSlugs, listProviders} = require('../../../../../../core/server/services/ai/providers');

describe('AI providers registry', function () {
    it('resolves a known provider slug to its class', function () {
        assert.equal(getProviderClass('anthropic'), AnthropicProvider);
    });

    it('returns undefined for an unknown provider slug', function () {
        assert.equal(getProviderClass('openai'), undefined);
    });

    it('lists supported provider slugs', function () {
        assert.deepEqual(getSupportedProviderSlugs(), ['anthropic']);
    });

    it('lists providers with their classes for capability routing', function () {
        assert.deepEqual(listProviders(), [{slug: 'anthropic', ProviderClass: AnthropicProvider}]);
    });
});
