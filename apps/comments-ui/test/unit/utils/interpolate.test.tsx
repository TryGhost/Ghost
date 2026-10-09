import { interpolate } from '../../../src/utils/interpolate';
import { render } from '@testing-library/preact';

describe('interpolate', () => {
  it('replaces placeholders', () => {
    const { container } = render(
      <p>
        {interpolate('Become a member of {publication} today, {publication}', {
          publication: <b>Ghost</b>,
        })}
      </p>,
    );

    expect(container.innerHTML).toBe('<p>Become a member of <b>Ghost</b> today, <b>Ghost</b></p>');
  });

  it('wraps tag contents', () => {
    const { container } = render(
      <p>
        {interpolate('Read the <a>docs</a> first.', {
          a: (content) => <a href="#docs">{content}</a>,
        })}
      </p>,
    );

    expect(container.innerHTML).toBe('<p>Read the <a href="#docs">docs</a> first.</p>');
  });

  it('leaves unknown tokens untouched', () => {
    const { container } = render(<p>{interpolate('{amount} characters left', {})}</p>);

    expect(container.innerHTML).toBe('<p>{amount} characters left</p>');
  });
});
