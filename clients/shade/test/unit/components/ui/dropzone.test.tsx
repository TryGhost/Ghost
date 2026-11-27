import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Dropzone } from '../../../../src/components/ui/dropzone';
import { render } from '../../utils/test-utils';

function createFile(name: string, type: string, contents = 'content') {
  return new File([contents], name, {
    type,
    lastModified: Date.now(),
  });
}

describe('Dropzone Component', () => {
  it('renders an accessible drop target', () => {
    render(
      <Dropzone>
        <span>Select or drop a CSV file</span>
      </Dropzone>,
    );

    const trigger = screen.getByRole('button', { name: /select or drop a csv file/i });

    expect(trigger, 'Drop target should be rendered as a keyboard-focusable button').toBeTruthy();
    expect(trigger.getAttribute('tabindex'), 'Drop target should be tabbable').toBe('0');
  });

  it('opens the file dialog when activated with the keyboard', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    try {
      render(
        <Dropzone>
          <span>Upload CSV</span>
        </Dropzone>,
      );

      const dropTarget = screen.getByRole('button', { name: /upload csv/i });

      fireEvent.keyDown(dropTarget, { key: 'Enter', code: 'Enter', keyCode: 13, charCode: 13 });

      await waitFor(() => {
        expect(clickSpy.mock.calls.length, 'Keyboard activation should open the file dialog').toBe(
          1,
        );
      });
    } finally {
      clickSpy.mockRestore();
    }
  });

  it('forwards compatibility identifiers and labels to the file input', () => {
    render(
      <Dropzone
        inputAriaLabel="Upload redirects file"
        inputId="upload-redirects"
        inputTestId="redirects-input"
      >
        Upload redirects file
      </Dropzone>,
    );

    const input = screen.getByLabelText('Upload redirects file');

    expect(
      input instanceof HTMLInputElement,
      'Accessible upload label should resolve to the file input',
    ).toBeTruthy();
    expect(input.id).toBe('upload-redirects');
    expect(input.getAttribute('data-testid')).toBe('redirects-input');
  });

  it('uses the secondary button recipe for compact filled upload actions', () => {
    render(<Dropzone variant="buttonSecondary">Upload file</Dropzone>);

    const dropTarget = screen.getByRole('button', { name: 'Upload file' });

    expect(dropTarget.className).toMatch(/bg-secondary/);
    expect(dropTarget.className).toMatch(/h-7/);
  });

  it('calls onDropAccepted for accepted files', async () => {
    const onDropAccepted = vi.fn();
    render(
      <Dropzone accept={{ 'text/csv': ['.csv'] }} onDropAccepted={onDropAccepted}>
        <span>Upload CSV</span>
      </Dropzone>,
    );

    const file = createFile('members.csv', 'text/csv', 'email\nmember@example.com');
    const dropTarget = screen.getByRole('button', { name: /upload csv/i });

    fireEvent.drop(dropTarget, {
      dataTransfer: {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      },
    });

    await waitFor(() => {
      expect(onDropAccepted.mock.calls.length, 'Accepted callback should be called once').toBe(1);
    });
  });

  it('calls onDropRejected for rejected files', async () => {
    const onDropRejected = vi.fn();
    render(
      <Dropzone accept={{ 'text/csv': ['.csv'] }} onDropRejected={onDropRejected}>
        <span>Upload CSV</span>
      </Dropzone>,
    );

    const file = createFile('notes.txt', 'text/plain', 'hello');
    const dropTarget = screen.getByRole('button', { name: /upload csv/i });

    fireEvent.drop(dropTarget, {
      dataTransfer: {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      },
    });

    await waitFor(() => {
      expect(onDropRejected.mock.calls.length, 'Rejected callback should be called once').toBe(1);
    });
  });

  it('does not accept drops when disabled', async () => {
    const onDropAccepted = vi.fn();
    render(
      <Dropzone disabled onDropAccepted={onDropAccepted}>
        <span>Upload CSV</span>
      </Dropzone>,
    );

    const file = createFile('members.csv', 'text/csv', 'email\nmember@example.com');
    const dropTarget = screen.getByRole('button', { name: /upload csv/i });

    fireEvent.drop(dropTarget, {
      dataTransfer: {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      },
    });

    await waitFor(() => {
      expect(
        onDropAccepted.mock.calls.length,
        'Accepted callback should not run while disabled',
      ).toBe(0);
    });
  });

  it('suppresses pointer and hover styles when disabled', () => {
    render(
      <Dropzone disabled>
        <span>Upload CSV</span>
      </Dropzone>,
    );

    const dropTarget = screen.getByRole('button', { name: /upload csv/i });
    const classes = dropTarget.className.split(/\s+/);

    expect(classes, 'Disabled dropzone should apply pointer-events-none directly').toContain(
      'pointer-events-none',
    );
    expect(classes, 'Disabled dropzone should not include hover border classes').not.toContain(
      'hover:border-gray-400',
    );
  });

  it('does not disable pointer events on child content by default', () => {
    render(
      <Dropzone>
        <span>Upload CSV</span>
      </Dropzone>,
    );

    const dropTarget = screen.getByRole('button', { name: /upload csv/i });

    expect(
      dropTarget.className,
      'Dropzone should not force pointer-events-none on its child content',
    ).not.toContain('[&>*:not(input)]:pointer-events-none');
  });
});
