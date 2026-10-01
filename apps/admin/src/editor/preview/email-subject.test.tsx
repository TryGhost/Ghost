import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SaveError } from '@/editor/engine/save-engine';
import { UNREACHABLE_MESSAGE } from '@/editor/publish/completion-message';
import { EMAIL_SUBJECT_TOO_LONG } from '@/editor/session/settings-fields';
import { EmailSubject } from './email-subject';

const TITLE = 'Hello from React';

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

  it('reports a failed save until the writer edits past it', () => {
    const rejected: SaveError = { kind: 'validation', message: 'Title cannot be that long.' };
    const { rerender } = render(<Harness saveError={rejected} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Validation failed: Title cannot be that long.',
    );
    expect(subjectInput()).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(subjectInput(), { target: { value: 'A new subject' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<Harness saveError={{ kind: 'transport', message: 'offline' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(UNREACHABLE_MESSAGE);
  });
});
