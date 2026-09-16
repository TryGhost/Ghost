import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Conversation } from './conversation';

describe('Conversation', () => {
  it('does not force a reader back to the latest message while scrolled up', () => {
    const { rerender } = render(
      <Conversation>
        <div>First message</div>
      </Conversation>,
    );
    const log = screen.getByRole('log');
    Object.defineProperties(log, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1000 },
    });
    log.scrollTop = 200;
    fireEvent.scroll(log);

    rerender(
      <Conversation>
        <div>First message</div>
        <div>Streaming update</div>
      </Conversation>,
    );

    expect(log.scrollTop).toBe(200);
    expect(screen.getByRole('button', { name: 'Jump to latest message' })).toBeInTheDocument();
  });
});
