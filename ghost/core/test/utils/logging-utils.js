const bunyan = require('bunyan');
const {PassThrough} = require('stream');

/**
 * Parse newline-delimited JSON log records from a buffered string.
 *
 * @param {string} buffer - Buffered log text that may contain multiple records.
 * @param {Array<object>} output - Collected parsed log records.
 * @returns {string} Remaining partial record that did not end with a newline.
 */
function parseBufferedJsonLogs(buffer, output) {
    const lines = buffer.split('\n');
    const remaining = lines.pop();

    for (const line of lines) {
        if (!line.trim()) {
            continue;
        }

        output.push(JSON.parse(line));
    }

    return remaining;
}

/**
 * Temporarily redirects Ghost logger streams to an in-memory Bunyan stream.
 *
 * This allows tests to assert on real serialized JSON output from
 * `@tryghost/logging` without stubbing logger methods.
 *
 * @param {import('@tryghost/logging')} logging - Logger singleton to capture.
 * @returns {{output: Array<object>, restore: () => void}} Capture handle.
 */
function captureLoggerOutput(logging) {
    const output = [];
    const stream = new PassThrough();
    let buffered = '';

    stream.on('data', (chunk) => {
        buffered += chunk.toString();
        buffered = parseBufferedJsonLogs(buffered, output);
    });

    const originalStreams = logging.streams;
    logging.streams = {
        capture: {
            name: 'capture',
            log: bunyan.createLogger({
                name: 'test-logger',
                streams: [{
                    type: 'stream',
                    stream,
                    level: 'trace'
                }]
            })
        }
    };

    return {
        output,
        restore() {
            buffered = parseBufferedJsonLogs(buffered, output);
            logging.streams = originalStreams;
            stream.destroy();
        }
    };
}

module.exports = {
    captureLoggerOutput
};
