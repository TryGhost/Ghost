import assert from 'node:assert/strict';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import NFTOEmbedProvider from '../../../../../core/server/services/oembed/nft-oembed-provider';

const ASSET_URL = new URL(
  'https://opensea.io/assets/ethereum/0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb/9998',
);
const API_URL =
  'https://api.opensea.io/api/v1/asset/0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb/9998/?format=json';

describe('NFTOEmbedProvider', function () {
  it('Can support requests for OpenSea Ethereum NTFs', async function () {
    const provider = new NFTOEmbedProvider({
      config: {
        apiKey: 'fake-api-key',
      },
    });

    const ethereumNFTURL = new URL(
      'https://opensea.io/assets/ethereum/0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb/9998',
    );

    const supportsRequest = await provider.canSupportRequest(ethereumNFTURL);

    assert(supportsRequest, 'Should support ethereum NFT URL');
  });

  it('does not support other hosts or chains', async function () {
    const provider = new NFTOEmbedProvider({ config: {} });

    assert.equal(
      await provider.canSupportRequest(
        new URL(
          'https://example.com/assets/ethereum/0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb/9998',
        ),
      ),
      false,
    );
    assert.equal(
      await provider.canSupportRequest(new URL('https://opensea.io/assets/matic/0xabc/1')),
      false,
    );
  });

  describe('transport', function () {
    function requestFailing(failure: Error) {
      const json = sinon.stub().rejects(failure);
      const externalRequest = sinon.stub().returns({ json });
      return { externalRequest, json };
    }

    it('requests the asset from the OpenSea API with the configured key and propagates its failure', async function () {
      const failure = new Error('OpenSea unavailable');
      const { externalRequest, json } = requestFailing(failure);
      const provider = new NFTOEmbedProvider({ config: { apiKey: 'fake-api-key' } });

      await assert.rejects(
        provider.getOEmbedData(ASSET_URL, externalRequest),
        (error: unknown) => error === failure,
      );

      sinon.assert.calledOnceWithExactly(externalRequest, API_URL, {
        headers: { 'X-API-KEY': 'fake-api-key' },
      });
      sinon.assert.calledOnceWithExactly(json);
    });

    it('omits the key header when no key is configured', async function () {
      const { externalRequest } = requestFailing(new Error('OpenSea unavailable'));
      const provider = new NFTOEmbedProvider({ config: {} });

      await assert.rejects(provider.getOEmbedData(ASSET_URL, externalRequest));

      sinon.assert.calledOnceWithExactly(externalRequest, API_URL, { headers: {} });
    });
  });
});
