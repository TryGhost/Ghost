import Flexsearch, { Charset } from 'flexsearch';
import type {
  Document,
  DocumentData,
  EncoderOptions,
  EnrichedDocumentSearchResults,
} from 'flexsearch';

export type SearchPost = {
  id: string;
  title: string;
  excerpt: string;
  url: string;
};

export type SearchAuthor = {
  id: string;
  name: string;
  url: string;
  profile_image: string | null;
};

export type SearchTag = {
  id: string;
  name: string;
  url: string;
};

export type SearchResults = {
  posts: SearchPost[];
  authors: SearchAuthor[];
  tags: SearchTag[];
};

const cjkEncoderPresetCodepoint: EncoderOptions = {
  finalize: (terms) => {
    const results: string[] = [];

    for (const term of terms) {
      results.push(...tokenizeCjkByCodePoint(term));
    }
    return results;
  },
};

function isCJK(codePoint: number) {
  return (
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) || // CJK Unified Ideographs
    (codePoint >= 0x3040 && codePoint <= 0x30ff) || // Hiragana & Katakana (contiguous blocks)
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) || // Korean Hangul Syllables
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) || // CJK Unified Ideographs Extension A
    (codePoint >= 0x20000 && codePoint <= 0x2a6df) || // CJK Unified Ideographs Extension B
    (codePoint >= 0x2a700 && codePoint <= 0x2ebef) || // CJK Unified Ideographs Extension C-F (contiguous blocks)
    (codePoint >= 0x30000 && codePoint <= 0x323af) || // Additional ideographs
    (codePoint >= 0x2ebf0 && codePoint <= 0x2ee5f) || // More extensions
    (codePoint >= 0xf900 && codePoint <= 0xfaff) || // Compatibility Ideographs
    (codePoint >= 0x2f800 && codePoint <= 0x2fa1f) // Supplementary ideographs
  );
}

export function tokenizeCjkByCodePoint(text: string) {
  const result: string[] = [];
  let buffer = '';

  for (const char of text) {
    // loops over unicode characters
    const codePoint = char.codePointAt(0)!;

    if (isCJK(codePoint)) {
      if (buffer) {
        result.push(buffer); // Push any non-CJK word we’ve been building
        buffer = '';
      }
      result.push(char); // Push the CJK char as its own token
    } else {
      buffer += char; // Keep building non-CJK text
    }
  }

  if (buffer) {
    result.push(buffer); // Push whatever is left when done
  }

  return result;
}

const encoderSet = new Flexsearch.Encoder(Charset.Default).assign(cjkEncoderPresetCodepoint);

export default class SearchIndex {
  apiUrl: string;
  apiKey: string | undefined;
  postsIndex: Document<SearchPost>;
  authorsIndex: Document<SearchAuthor>;
  tagsIndex: Document<SearchTag>;

  constructor({ adminUrl, apiKey, dir }: { adminUrl: string; apiKey?: string; dir: string }) {
    // flexsearch's own `rtl` option matches nothing at all in 0.8.x, even for
    // ASCII, so right-to-left support comes from reverse tokenisation alone.
    const tokenize = dir === 'rtl' ? 'reverse' : 'forward';

    this.apiUrl = adminUrl;
    this.apiKey = apiKey;

    this.postsIndex = new Flexsearch.Document({
      tokenize: tokenize,
      document: {
        id: 'id',
        index: ['title', 'excerpt'],
        store: true,
      },
      encoder: encoderSet,
    });

    this.authorsIndex = new Flexsearch.Document({
      tokenize: tokenize,
      document: {
        id: 'id',
        index: ['name'],
        store: true,
      },
      encoder: encoderSet,
    });

    this.tagsIndex = new Flexsearch.Document({
      tokenize: tokenize,
      document: {
        id: 'id',
        index: ['name'],
        store: true,
      },
      encoder: encoderSet,
    });

    this.init = this.init.bind(this);
    this.search = this.search.bind(this);
  }

  async #populatePostIndex() {
    const posts = await this.#fetchPosts();

    if (posts.length > 0) {
      this.#updatePostIndex(posts);
    }
  }

  async #fetchPosts(): Promise<SearchPost[]> {
    try {
      const url = `${this.apiUrl}/ghost/api/content/search-index/posts/?key=${this.apiKey}`;
      const response = await fetch(url);
      const json = await response.json();

      return json.posts;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching posts:', error);
      return [];
    }
  }

  #updatePostIndex(posts: SearchPost[]) {
    posts.forEach((post) => {
      this.postsIndex.add(post);
    });
  }

  async #populateAuthorsIndex() {
    const authors = await this.#fetchAuthors();

    if (authors.length > 0) {
      this.#updateAuthorsIndex(authors);
    }
  }

  async #fetchAuthors(): Promise<SearchAuthor[]> {
    try {
      const url = `${this.apiUrl}/ghost/api/content/search-index/authors/?key=${this.apiKey}`;
      const response = await fetch(url);
      const json = await response.json();

      return json.authors;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching authors:', error);
      return [];
    }
  }

  #updateAuthorsIndex(authors: SearchAuthor[]) {
    authors.forEach((author) => {
      this.authorsIndex.add(author);
    });
  }

  async #populateTagsIndex() {
    const tags = await this.#fetchTags();

    if (tags.length > 0) {
      this.#updateTagsIndex(tags);
    }
  }

  async #fetchTags(): Promise<SearchTag[]> {
    try {
      const url = `${this.apiUrl}/ghost/api/content/search-index/tags/?key=${this.apiKey}`;
      const response = await fetch(url);
      const json = await response.json();

      return json.tags;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching tags:', error);
      return [];
    }
  }

  #updateTagsIndex(tags: SearchTag[]) {
    tags.forEach((tag) => {
      this.tagsIndex.add(tag);
    });
  }

  async init() {
    await this.#populatePostIndex();
    await this.#populateAuthorsIndex();
    await this.#populateTagsIndex();
  }

  #normalizeSearchResult<D extends DocumentData>(result: EnrichedDocumentSearchResults<D>) {
    const normalized: D[] = [];
    const usedIds: Record<string, boolean> = {};

    result.forEach((resultItem) => {
      resultItem.result.forEach((doc) => {
        if (!usedIds[doc.id]) {
          normalized.push(doc.doc!);
          usedIds[doc.id] = true;
        }
      });
    });

    return normalized;
  }

  search(value: string): SearchResults {
    const posts = this.postsIndex.search(value, {
      enrich: true,
    });
    const authors = this.authorsIndex.search(value, {
      enrich: true,
    });
    const tags = this.tagsIndex.search(value, {
      enrich: true,
    });

    return {
      posts: this.#normalizeSearchResult(posts),
      authors: this.#normalizeSearchResult(authors),
      tags: this.#normalizeSearchResult(tags),
    };
  }
}
