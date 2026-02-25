const bunyan = require('bunyan');
const {PassThrough} = require('stream');

function captureLoggerOutput(logging) {
    const output = [];
    const stream = new PassThrough();
    let buffered = '';

    stream.on('data', (chunk) => {
        buffered += chunk.toString();
        const lines = buffered.split('\n');
        buffered = lines.pop();

        for (const line of lines) {
            if (!line.trim()) {
                continue;
            }

            output.push(JSON.parse(line));
        }
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
            logging.streams = originalStreams;
            stream.destroy();
        }
    };
}

module.exports = {
    captureLoggerOutput
};
