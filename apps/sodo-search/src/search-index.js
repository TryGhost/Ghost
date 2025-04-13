import Flexsearch from 'flexsearch';
import FlexSearch, {Charset} from 'flexsearch';
import GhostContentAPI from '@tryghost/content-api';

// We switch to specifying the CJK character ranges (which should change rarely?)
// rather than specifying the non-CJK character ranges (hard!)
const CJKRegex = new RegExp(
    [
      '[', // opening bracket for character set
      // CJK Unified Ideographs
      '\u{4E00}-\u{9FFF}',
      // Japanese Hiragana and Katakana
      '\u{3040}-\u{309F}\u{30A0}-\u{30FF}',
      // Korean Hangul Syllables
      '\u{AC00}-\u{D7A3}',
      // CJK Unified Ideographs Extension A
      '\u{3400}-\u{4DBF}',
      // CJK Unified Ideographs Extension B
      '\u{20000}-\u{2A6DF}',
      // CJK Unified Ideographs Extension C
      '\u{2A700}-\u{2B73F}',
      // CJK Unified Ideographs Extension D
      '\u{2B740}-\u{2B81F}',
      // CJK Unified Ideographs Extension E
      '\u{2B820}-\u{2CEAF}',
      // CJK Unified Ideographs Extension F
      '\u{2CEB0}-\u{2EBEF}',
      // Additional ideographs
      '\u{30000}-\u{3134F}',
      '\u{31350}-\u{323AF}',
      // More extensions
      '\u{2EBF0}-\u{2EE5F}',
      // Compatibility Ideographs
      '\u{F900}-\u{FAFF}',
      // Supplementary ideographs
      '\u{2F800}-\u{2FA1F}',
      ']'  // closing bracket for character set
    ].join(''),
    'mug'
  );

const CjkEncoderPreset = {
    finalize: (terms) => {

      let results = []
  
      const tokenizeCjkCharacterOnly = (text) => {
        if (!text || text.length == 0) return [];
  
        const splited = [];
        let lastIndex = -1;
  
        // Match CJK character one by one
        for (const matched of text.matchAll(CJKRegex)) {
          if (matched.index > lastIndex + 1) {
            // Non-cjk string exists before the matched cjk character
            splited.push(text.substring(lastIndex + 1, matched.index));
            splited.push(text[matched.index]);
          } else if (matched.index == lastIndex + 1) {
            // It is continuous with the previous cjk character
            splited.push(text[matched.index]);
          } else {
            // Actually this case should not happen
          }
          lastIndex = matched.index;
        }
  
        if (lastIndex + 1 < text.length) {
          // Add the rest of the string
          splited.push(text.substring(lastIndex + 1, text.length));
        }
  
        return splited;
      }
  
      for (const term of terms) {
        const splited = tokenizeCjkCharacterOnly(term);
        results = results.concat(splited);
      }
  
      return results;
    },
  
  };

export default class SearchIndex {
    constructor({adminUrl, apiKey, dir}) {
        this.api = new GhostContentAPI({
            url: adminUrl,
            key: apiKey,
            version: 'v5.0'
        });
        const rtl = (dir === 'rtl');
        const tokenize = (dir === 'rtl') ? 'reverse' : 'forward';
        this.postsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['title', 'excerpt'],
                store: true,
            },
            encoder: new FlexSearch.Encoder(
                Charset.Default,
                CjkEncoderPreset
            )
            //...this.#getEncodeOptions()
        });
        this.authorsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            encoder: new FlexSearch.Encoder(
                Charset.Default,
                CjkEncoderPreset
            )
                        //...this.#getEncodeOptions()
        });
        this.tagsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            encoder: new FlexSearch.Encoder(
                Charset.Default,
                CjkEncoderPreset
            )
            //...this.#getEncodeOptions()
        });

        this.init = this.init.bind(this);
        this.search = this.search.bind(this);
    }

    #updatePostIndex(posts) {
        posts.forEach((post) => {
            this.postsIndex.add(post);
        });
    }

    #updateAuthorsIndex(authors) {
        authors.forEach((author) => {
            this.authorsIndex.add(author);
        });
    }

    #updateTagsIndex(tags) {
        tags.forEach((tag) => {
            this.tagsIndex.add(tag);
        });
    }

    async init() {
        let posts = await this.api.posts.browse({
            limit: '10000',
            fields: 'id,slug,title,excerpt,url,updated_at,visibility',
            order: 'updated_at DESC'
        });

        if (posts || posts.length > 0) {
            if (!posts.length) {
                posts = [posts];
            }
            this.#updatePostIndex(posts);
        }

        let authors = await this.api.authors.browse({
            limit: '10000',
            fields: 'id,slug,name,url,profile_image',
            order: 'updated_at DESC'
        });

        if (authors || authors.length > 0) {
            if (!authors.length) {
                authors = [authors];
            }

            this.#updateAuthorsIndex(authors);
        }

        let tags = await this.api.tags.browse({
            limit: '10000',
            fields: 'id,slug,name,url',
            order: 'updated_at DESC',
            filter: 'visibility:public'
        });

        if (tags || tags.length > 0) {
            if (!tags.length) {
                tags = [tags];
            }

            this.#updateTagsIndex(tags);
        }
    }

    #normalizeSearchResult(result) {
        const normalized = [];
        const usedIds = {};

        result.forEach((resultItem) => {
            resultItem.result.forEach((doc) => {
                if (!usedIds[doc.id]) {
                    normalized.push(doc.doc);
                    usedIds[doc.id] = true;
                }
            });
        });

        return normalized;
    }

    search(value) {
        const posts = this.postsIndex.search(value, {
            enrich: true
        });
        const authors = this.authorsIndex.search(value, {
            enrich: true
        });
        const tags = this.tagsIndex.search(value, {
            enrich: true
        });

        return {
            posts: this.#normalizeSearchResult(posts),
            authors: this.#normalizeSearchResult(authors),
            tags: this.#normalizeSearchResult(tags)
        };
    }
}
