const assert = require('node:assert/strict');
const { createReadStream, createWriteStream } = require('node:fs');
const { mkdtemp, rm, stat } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');

const BYTES = 1024 ** 3;
const RECORD_BYTES = 4 * 1024 ** 2;

function* generatedCSV() {
  const header = Buffer.from('title,unused_padding\n');
  const padding = Buffer.alloc(RECORD_BYTES, 'x');
  yield header;
  let remaining = BYTES - header.length;
  for (let row = 1; remaining > 0; row++) {
    const title = Buffer.from(`M8 benchmark row ${row},`);
    const recordBytes = Math.min(RECORD_BYTES, remaining);
    yield title;
    yield padding.subarray(0, recordBytes - title.length - 1);
    yield Buffer.from('\n');
    remaining -= recordBytes;
  }
}

describe.skipIf(process.env.CSV_IMPORT_BENCHMARK !== '1')(
  'Manual 1 GiB CSV import benchmark',
  function () {
    it('imports generated data through the Admin API and records elapsed time and peak RSS', async function () {
      const agent = await agentProvider.getAdminAPIAgent();
      await fixtureManager.init('users');
      await agent.loginAsOwner();
      mockManager.mockMail();
      const directory = await mkdtemp(path.join(os.tmpdir(), 'csv-import-benchmark-'));
      const file = path.join(directory, 'one-gib.csv');
      let sampler;
      try {
        await pipeline(Readable.from(generatedCSV()), createWriteStream(file));
        assert.equal((await stat(file)).size, BYTES);
        const start = performance.now();
        const initialRss = process.memoryUsage.rss();
        let peakRss = initialRss;
        sampler = setInterval(() => {
          peakRss = Math.max(peakRss, process.memoryUsage.rss());
        }, 25);
        // The test agent's attach() buffers the multipart form. Stream the
        // fixture through the same upload middleware to measure Ghost itself.
        const boundary = 'ghost-csv-benchmark';
        const opening = Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="postsfile"; filename="one-gib.csv"\r\nContent-Type: text/csv\r\n\r\n`,
        );
        const closing = Buffer.from(`\r\n--${boundary}--\r\n`);
        const body = Readable.from(
          (async function* () {
            yield opening;
            yield* createReadStream(file);
            yield closing;
          })(),
        );
        await agent
          .post('posts/upload/')
          .header('content-type', `multipart/form-data; boundary=${boundary}`)
          .header('content-length', String(opening.length + BYTES + closing.length))
          .stream(body)
          .expectStatus(202);
        const email = await mockManager.assert.sentEmailEventually(
          { subject: 'Your content import is complete' },
          { timeout: 300000 },
        );
        assert.match(email.html, /Created:<\/strong> 256/);
        process.stdout.write(
          `CSV benchmark ${JSON.stringify({
            bytes: BYTES,
            rows: 256,
            elapsedMs: Math.round(performance.now() - start),
            initialRssBytes: initialRss,
            peakSampledRssBytes: peakRss,
            processHighWaterRssKiB: process.resourceUsage().maxRSS,
          })}\n`,
        );
      } finally {
        clearInterval(sampler);
        mockManager.restore();
        await rm(directory, { recursive: true, force: true });
      }
    }, 300000);
  },
);
