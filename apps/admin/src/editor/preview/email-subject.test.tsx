import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SaveError } from '@/editor/engine/save-engine';
import { CONFLICT_MESSAGE, UNREACHABLE_MESSAGE } from '@/editor/publish/completion-message';
import { ACCESS_LOST, POST_DELETED } from '@/editor/session/error-mapping';
import { EMAIL_SUBJECT_TOO_LONG } from '@/editor/session/settings-fields';
import { EmailSubject } from './email-subject';

const TITLE = 'Hello from React';
const COLLISION: SaveError = { kind: 'conflict', message: 'Saving failed!' };

interface HarnessProps {
  subject?: string | null;
  title?: string;
  saveError?: SaveError | null;
  calls?: string[];
}

/** Holds the subject the way the session does, recording what the field stages and commits. */
function Harness({ subject = null, title = TITLE, saveError = null, calls = [] }: HarnessProps) {
  const [value, setValue] = useState(subject);

  return (
    <EmailSubject
      editor={{
        value,
        fallback: title,
        hasUnsavedChanges: false,
        isSaving: false,
        saveError,
        onChange: (next) => {
          calls.push(`stage ${JSON.stringify(next)}`);
          setValue(next);
        },
        onCommit: () => calls.push('commit'),
      }}
    />
  );
}

const subjectInput = () => screen.getByRole('textbox', { name: 'Email subject' });

describe('EmailSubject', () => {
  it('shows the title until a subject is set, with the title cut to 40 characters as placeholder', () => {
    const { rerender } = render(<Harness title={'a'.repeat(37)} />);
    expect(subjectInput()).toHaveValue('a'.repeat(37));
    expect(subjectInput()).toHaveAttribute('placeholder', 'a'.repeat(37));

    rerender(<Harness title={'b'.repeat(38)} />);
    expect(subjectInput()).toHaveAttribute('placeholder', `${'b'.repeat(37)}...`);
  });

  it('stores a cleared subject as no subject before committing it', () => {
    const calls: string[] = [];
    render(<Harness calls={calls} subject="A custom subject" />);

    fireEvent.change(subjectInput(), { target: { value: '' } });
    expect(subjectInput()).toHaveValue('');
    fireEvent.blur(subjectInput());

    expect(calls).toEqual(['stage ""', 'stage null', 'commit']);
    expect(subjectInput()).toHaveValue(TITLE);
  });

  it('commits on Enter, but never a subject past the limit', () => {
    const calls: string[] = [];
    render(<Harness calls={calls} />);

    subjectInput().focus();
    fireEvent.change(subjectInput(), { target: { value: 'x'.repeat(301) } });
    fireEvent.keyDown(subjectInput(), { key: 'Enter' });
    expect(screen.getByRole('alert')).toHaveTextContent(EMAIL_SUBJECT_TOO_LONG);
    expect(calls).not.toContain('commit');

    subjectInput().focus();
    fireEvent.change(subjectInput(), { target: { value: 'x'.repeat(300) } });
    fireEvent.keyDown(subjectInput(), { key: 'Enter' });
    expect(calls.at(-1)).toBe('commit');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports its own failed save until the writer edits past it', () => {
    const { rerender } = render(<Harness saveError={{ kind: 'transport', message: 'offline' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(UNREACHABLE_MESSAGE);
    expect(subjectInput()).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(subjectInput(), { target: { value: 'A new subject' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(subjectInput()).toHaveAttribute('aria-invalid', 'false');

    rerender(<Harness saveError={{ kind: 'validation', message: 'Subject refused.' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Validation failed: Subject refused.');
  });

  it.each([
    ['a collision', COLLISION, CONFLICT_MESSAGE],
    ['a deleted post', POST_DELETED, POST_DELETED.message],
    ['lost access', ACCESS_LOST, ACCESS_LOST.message],
  ])('keeps %s in view through an edit', (_case, saveError, message) => {
    render(<Harness saveError={saveError} />);

    fireEvent.change(subjectInput(), { target: { value: 'A new subject' } });
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(subjectInput()).toHaveAttribute('aria-invalid', 'true');
  });
});
