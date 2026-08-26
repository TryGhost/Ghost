import assert from 'assert/strict';
import { describe, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { PageHeader } from '@/components/patterns/page-header';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { render } from '../../utils/test-utils';

describe('PageHeader.Left', () => {
  it('preserves the original title stack when leading is omitted', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Left className="custom-left">
          <PageHeader.Breadcrumb>Library</PageHeader.Breadcrumb>
          <PageHeader.Title>Item</PageHeader.Title>
        </PageHeader.Left>
      </PageHeader>,
    );

    const left = container.querySelector('[data-page-header="left"]');
    assert.ok(left?.classList.contains('custom-left'));
    assert.ok(left?.classList.contains('flex-col'));
    assert.equal(left?.children.length, 2);
    assert.equal(container.querySelector('[data-page-header="leading"]'), null);
  });

  it('places the leading control before the complete title block without taking focus', () => {
    const onClick = vi.fn();
    const { container } = render(
      <PageHeader>
        <PageHeader.Left
          className="custom-left"
          leading={
            <>
              <Button onClick={onClick}>Toggle navigation</Button>
              <Separator orientation="vertical" />
            </>
          }
        >
          <PageHeader.Breadcrumb>
            <a href="#library">Library</a>
          </PageHeader.Breadcrumb>
          <PageHeader.Title>Item</PageHeader.Title>
        </PageHeader.Left>
        <PageHeader.Actions>
          <Button>Save</Button>
        </PageHeader.Actions>
      </PageHeader>,
    );

    const left = container.querySelector('[data-page-header="left"]');
    assert.ok(left?.classList.contains('custom-left'));
    assert.equal(left?.children[0].getAttribute('data-page-header'), 'leading');
    assert.equal(left?.children[1].getAttribute('data-page-header'), 'title-block');
    assert.equal(screen.getByRole('heading', { level: 1 }).textContent, 'Item');
    assert.equal(screen.queryByRole('separator'), null, 'divider is decorative');
    const control = screen.getByRole('button', { name: 'Toggle navigation' });
    assert.notEqual(document.activeElement, control);
    control.focus();
    fireEvent.click(control);
    assert.equal(document.activeElement, control);
    assert.equal(onClick.mock.calls.length, 1);
  });

  it('preserves disabled controls in the leading slot', () => {
    const onClick = vi.fn();
    render(
      <PageHeader>
        <PageHeader.Left
          leading={
            <Button disabled onClick={onClick}>
              Toggle navigation
            </Button>
          }
        >
          <PageHeader.Title>Library</PageHeader.Title>
        </PageHeader.Left>
      </PageHeader>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
    assert.equal(onClick.mock.calls.length, 0);
  });
});
