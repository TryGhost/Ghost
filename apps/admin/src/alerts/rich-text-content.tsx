import type { RichText } from './rich-text';

export function RichTextContent({ value }: { value: RichText }) {
  if (typeof value === 'string') {
    return value;
  }

  return <span dangerouslySetInnerHTML={{ __html: value.html }} />;
}
