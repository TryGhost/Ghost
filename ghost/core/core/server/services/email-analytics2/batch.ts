// TODO(ea2) Move this to another file and add tests
export async function* batch<T>(iterable: AsyncIterable<T>, options: {maxSize: number, maxWait: number}): AsyncIterable<T[]> {
    // TODO(ea2) Implement this
}