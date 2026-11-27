import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web';
import '@testing-library/jest-dom';
import { setupShadeMocks } from '@tryghost/admin-x-framework/test/setup';

// The vmThreads pool runs each file in a jsdom VM context, which lacks Node's
// web streams; msw needs them
Object.assign(globalThis, {
  ReadableStream: globalThis.ReadableStream ?? ReadableStream,
  TransformStream: globalThis.TransformStream ?? TransformStream,
  WritableStream: globalThis.WritableStream ?? WritableStream,
});

setupShadeMocks();
