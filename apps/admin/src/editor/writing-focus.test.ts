import { describe, expect, it } from 'vitest';
import {
  CHROME_SHOWN,
  POINTER_TRAVEL_TO_REVEAL,
  type WritingFocusEvent,
  type WritingFocusState,
  isWritingInput,
  nextWritingFocus,
} from './writing-focus';

function run(events: WritingFocusEvent[], from: WritingFocusState = CHROME_SHOWN) {
  return events.reduce(nextWritingFocus, from);
}

const at = (x: number, y: number): WritingFocusEvent => ({ type: 'pointer-move', point: { x, y } });

describe('nextWritingFocus', () => {
  it('hides the chrome on an edit', () => {
    expect(run([{ type: 'edit' }]).hidden).toBe(true);
  });

  it('keeps where the pointer was first seen across further edits', () => {
    const state = run([{ type: 'edit' }, at(100, 100), { type: 'edit' }]);

    expect(state).toEqual({ hidden: true, anchor: { x: 100, y: 100 } });
  });

  it('ignores the pointer while the chrome is shown', () => {
    expect(run([at(0, 0), at(500, 500)])).toBe(CHROME_SHOWN);
  });

  it('stays hidden on the first move after hiding, which only marks where the pointer is', () => {
    expect(run([{ type: 'edit' }, at(100, 100)]).hidden).toBe(true);
  });

  it('stays hidden while the pointer travels no further than the threshold', () => {
    const state = run([
      { type: 'edit' },
      at(100, 100),
      at(100 + POINTER_TRAVEL_TO_REVEAL, 100),
      at(106, 108),
    ]);

    expect(state.hidden).toBe(true);
  });

  it('stays hidden on moves at the same position, as a scroll under a still pointer sends', () => {
    expect(run([{ type: 'edit' }, at(100, 100), at(100, 100), at(100, 100)]).hidden).toBe(true);
  });

  it('shows the chrome once the pointer travels past the threshold', () => {
    expect(run([{ type: 'edit' }, at(100, 100), at(108, 108)])).toEqual(CHROME_SHOWN);
  });

  it('measures travel from where the pointer was first seen, not from its last move', () => {
    const state = run([{ type: 'edit' }, at(100, 100), at(106, 100), at(112, 100)]);

    expect(state).toEqual(CHROME_SHOWN);
  });

  it('shows the chrome on a reveal', () => {
    expect(run([{ type: 'edit' }, at(100, 100), { type: 'reveal' }])).toEqual(CHROME_SHOWN);
  });

  it('starts measuring afresh after the chrome hides again', () => {
    const state = run([
      { type: 'edit' },
      at(100, 100),
      at(200, 200),
      { type: 'edit' },
      at(205, 205),
    ]);

    expect(state).toEqual({ hidden: true, anchor: { x: 205, y: 205 } });
  });
});

describe('isWritingInput', () => {
  it.each([
    'insertText',
    'insertParagraph',
    'insertLineBreak',
    'insertCompositionText',
    'insertFromPaste',
    'insertFromDrop',
    'deleteContentBackward',
    'deleteContentForward',
    'deleteByCut',
    'deleteWordBackward',
  ])('counts %s as writing', (inputType) => {
    expect(isWritingInput(inputType)).toBe(true);
  });

  it.each(['formatBold', 'formatItalic', 'formatUnderline', 'historyUndo', 'historyRedo'])(
    'leaves the chrome for the shortcut behind %s',
    (inputType) => {
      expect(isWritingInput(inputType)).toBe(false);
    },
  );
});
