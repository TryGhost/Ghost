export default function getReadingTime(content: string): string {
  // Average reading speed (words per minute)
  const wordsPerMinute = 275;

  const document = new DOMParser().parseFromString(content, 'text/html');
  document.querySelectorAll('script, style').forEach((element) => element.remove());
  document
    .querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre, br, td, th')
    .forEach((element) => element.after(' '));

  // Decode entities and retain block boundaries without splitting inline formatting.
  const wordCount = (document.body.textContent || '')
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}
