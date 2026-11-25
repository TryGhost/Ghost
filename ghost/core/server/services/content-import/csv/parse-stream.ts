import { Readable } from 'node:stream';
import errors from '@tryghost/errors';
import papaparse from 'papaparse';

// Papa's Node pipe mode drops parse errors. Its step callback preserves them,
// while this one-record buffer lets consumers await each row before reading on.
export async function* parseCSVStream(
  input: Readable,
  options: Pick<papaparse.ParseConfig, 'delimiter' | 'newline' | 'skipEmptyLines'>,
): AsyncGenerator<string[]> {
  let parser: papaparse.Parser | undefined;
  let complete = false;
  let paused = false;
  let record = 0;
  const rows = new Readable({
    objectMode: true,
    highWaterMark: 1,
    read() {
      // Resume after Papa has returned from step and finished pausing itself.
      queueMicrotask(() => {
        if (!rows.destroyed) {
          if (parser && paused) {
            paused = false;
            parser.resume();
          }
          if (!paused) {
            input.resume();
          }
        }
      });
    },
    destroy(error, callback) {
      if (!complete) {
        parser?.abort();
      }
      input.destroy();
      callback(error);
    },
  });
  const onClose = () => {
    if (!input.readableEnded) {
      rows.destroy(
        new errors.InternalServerError({ message: 'CSV input closed before parsing completed.' }),
      );
    }
  };
  input.once('close', onClose);
  // Decode across chunk boundaries so split UTF-8 characters remain intact.
  input.setEncoding('utf8');
  papaparse.parse<string[]>(input, {
    ...options,
    step(result, handle) {
      parser = handle;
      record += 1;
      const failure = result.errors[0];
      if (failure) {
        rows.destroy(
          new errors.ValidationError({
            message: `The CSV could not be parsed: ${failure.message} (row ${record}).`,
          }),
        );
      } else {
        // Pausing Papa alone still lets its input queue grow. Pause both sides.
        paused = true;
        input.pause();
        handle.pause();
        rows.push(result.data);
      }
    },
    complete() {
      complete = true;
      if (!rows.destroyed) {
        rows.push(null);
      }
    },
    error(error) {
      rows.destroy(error);
    },
  });
  try {
    yield* rows as AsyncIterable<string[]>;
  } finally {
    rows.destroy();
    input.destroy();
    input.off('close', onClose);
  }
}
