// NY-1715 exploration only — never merge. NY-1736 owns real TK support in the email editor.

// Subjects: TK as its own word, in any casing. Ghost's post titles only catch an uppercase TK,
// which engineering flagged as a bug; automations don't copy it.
const SUBJECT_TK_REGEX = /(^|.)([^\p{L}\p{N}\s]*(tk)+[^\p{L}\p{N}\s]*)(.)?/iu;
// Koenig's TKPlugin pattern for the body: TK, Tk or tk as its own word.
const BODY_TK_REGEX = /(^|.)([^\p{L}\p{N}\s]*(TK|Tk|tk)+[^\p{L}\p{N}\s]*)(.)?/u;
const WORD_CHAR_REGEX = /\p{L}|\p{N}/u;

// Where the first TK in `text` starts and ends. As in Koenig, the characters either side are
// captured, not looked behind, and must not be letters or numbers.
const findTk = (text: string, regex: RegExp): { start: number; end: number } | null => {
  let offset = 0;
  let match = regex.exec(text);
  while (match !== null) {
    const [, before = '', tk = '', , after] = match;
    const isWord =
      !(before.trim() && WORD_CHAR_REGEX.test(before)) &&
      !(after?.trim() && WORD_CHAR_REGEX.test(after));
    const start = offset + match.index + before.length;
    if (isWord) {
      return { start, end: start + tk.length };
    }
    const next = match.index + match[0].length - 1;
    offset += next;
    match = regex.exec(text.slice(offset));
  }
  return null;
};

export const findSubjectTk = (subject: string) => findTk(subject, SUBJECT_TK_REGEX);

// Every TK in a run of body text, in order.
export const findBodyTks = (text: string): Array<{ start: number; end: number }> => {
  const found: Array<{ start: number; end: number }> = [];
  let offset = 0;
  let tk = findTk(text, BODY_TK_REGEX);
  while (tk) {
    found.push({ start: offset + tk.start, end: offset + tk.end });
    offset += tk.end;
    tk = findTk(text.slice(offset), BODY_TK_REGEX);
  }
  return found;
};

const lexicalHasTk = (lexical: string): boolean => {
  let document: unknown;
  try {
    document = JSON.parse(lexical);
  } catch {
    return false;
  }
  const visit = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') {
      return false;
    }
    if ('text' in node && typeof node.text === 'string' && findTk(node.text, BODY_TK_REGEX)) {
      return true;
    }
    const children = 'children' in node && Array.isArray(node.children) ? node.children : [];
    return children.some(visit);
  };
  return document !== null && typeof document === 'object' && 'root' in document
    ? visit(document.root)
    : false;
};

// Whether an email still has a TK reminder in its subject or body.
export const emailHasTk = (subject: string, lexical: string): boolean =>
  findSubjectTk(subject) !== null || lexicalHasTk(lexical);

// Selects the first TK in the body editor's text, as clicking Koenig's TK indicator does, and
// scrolls it into view. False when there's none yet (the editor may still be loading).
export const selectFirstBodyTk = (editable: HTMLElement): boolean => {
  const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const tk = findTk(node.textContent ?? '', BODY_TK_REGEX);
    if (!tk) {
      continue;
    }
    editable.focus({ preventScroll: true });
    const range = document.createRange();
    range.setStart(node, tk.start);
    range.setEnd(node, tk.end);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    node.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return true;
  }
  return false;
};

// Clicking a card's TK marker opens its email at the first TK. The card only opens the editor,
// so it leaves this note for the editor to pick up as it opens.
let isTkFocusRequested = false;
export const requestTkFocus = () => {
  isTkFocusRequested = true;
};
export const hasTkFocusRequest = () => isTkFocusRequested;
export const clearTkFocusRequest = () => {
  isTkFocusRequested = false;
};
