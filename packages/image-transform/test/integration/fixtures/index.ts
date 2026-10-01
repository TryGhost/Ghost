import path from 'node:path';

const getPath = (filename: string) => path.join(import.meta.dirname, filename);

export const inputJpeg = getPath('saw.jpg');
export const inputPng = getPath('saw.png');
export const inputWebp = getPath('tree.webp');
