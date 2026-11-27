import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../../src/components/ui/dialog';
import { render } from '../../utils/test-utils';

describe('Dialog Components', () => {
  it('renders Dialog with trigger button correctly', () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger data-testid="dialog-trigger">Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogHeader>
          <p>Dialog Content</p>
          <DialogFooter>
            <button type="button">Cancel</button>
            <button type="button">Submit</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const trigger = screen.getByTestId('dialog-trigger');
    expect(trigger, 'Dialog trigger should be rendered').toBeTruthy();
    expect(trigger.textContent, 'Trigger should have correct text').toBe('Open Dialog');
  });

  it('pins the dialog to the window by default', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog-content">
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const content = screen.getByTestId('dialog-content');
    expect(content.className, 'Should be fixed in the window').toContain('fixed');
  });

  it('scrolls the whole dialog with the backdrop when scroll is overlay', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog-content" scroll="overlay">
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const content = screen.getByTestId('dialog-content');
    expect(content.className, 'Should sit in the backdrop, not the window').not.toContain('fixed');
    const overlay = content.closest('[data-slot="dialog-overlay"]')!;
    expect(overlay, 'The dialog should sit inside the backdrop').toBeTruthy();
    expect(overlay.className, 'The backdrop should be the scroll container').toContain(
      'overflow-y-auto',
    );
    expect(overlay.className, 'The backdrop should cover the window').toContain('fixed');
  });

  it('shows a non-modal overlay dialog and leaves the page behind it usable', () => {
    render(
      <Dialog modal={false} open>
        <DialogContent data-testid="dialog-content" scroll="overlay">
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const content = screen.getByTestId('dialog-content');
    const scroller = content.closest<HTMLElement>('[data-slot="dialog-scroller"]')!;
    expect(scroller, 'The dialog should sit in a scroll container').toBeTruthy();
    expect(scroller.className, 'Presses beside the dialog should reach the page').toContain(
      'pointer-events-none',
    );
    expect(content.className, 'The dialog should take presses').toContain('pointer-events-auto');
  });

  it('closes an overlay dialog only when the backdrop is clicked, not just pressed', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent data-testid="dialog-content" scroll="overlay">
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    // Radix starts listening for outside presses on the next tick.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    const overlay = screen
      .getByTestId('dialog-content')
      .closest<HTMLElement>('[data-slot="dialog-overlay"]')!;
    expect(overlay).toBeTruthy();

    // Dragging the backdrop's scrollbar presses the backdrop but never clicks it.
    fireEvent.pointerDown(overlay, { button: 0 });
    fireEvent.pointerUp(overlay, { button: 0 });
    expect(onOpenChange.mock.calls.length, 'A press alone should keep the dialog open').toBe(0);

    fireEvent.pointerDown(overlay, { button: 0 });
    fireEvent.click(overlay);
    expect(onOpenChange.mock.calls, 'A click on the backdrop should close').toStrictEqual([
      [false],
    ]);
  });

  it('applies custom className to DialogHeader correctly', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Required Title</DialogTitle>
          <DialogDescription>Required Description</DialogDescription>
          <DialogHeader className="custom-header-class" data-testid="dialog-header">
            <div>Title</div>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    const header = screen.getByTestId('dialog-header');
    expect(header.className, 'Should have custom class').toContain('custom-header-class');
    expect(header.className, 'Should have default styling').toContain('flex flex-col');
  });

  it('applies custom className to DialogFooter correctly', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Required Title</DialogTitle>
          <DialogDescription>Required Description</DialogDescription>
          <DialogFooter className="custom-footer-class" data-testid="dialog-footer">
            <button type="button">Button</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const footer = screen.getByTestId('dialog-footer');
    expect(footer.className, 'Should have custom class').toContain('custom-footer-class');
    expect(footer.className, 'Should have default styling').toContain('flex flex-col-reverse');
  });

  it('renders DialogTitle with correct styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle data-testid="dialog-title">Test Title</DialogTitle>
          <DialogDescription>Required description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const title = screen.getByTestId('dialog-title');
    expect(title.tagName.toLowerCase(), 'Should be an h2 element').toBe('h2');
    expect(title.textContent, 'Should have correct text content').toBe('Test Title');
    expect(
      title.className.includes('text-xl') && title.className.includes('font-semibold'),
      'Should have default styling',
    ).toBeTruthy();
  });

  it('applies custom className to DialogTitle correctly', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle className="custom-title-class" data-testid="dialog-title">
            Test Title
          </DialogTitle>
          <DialogDescription>Required description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const title = screen.getByTestId('dialog-title');
    expect(title.className, 'Should have custom class').toContain('custom-title-class');
  });

  it('renders DialogDescription with correct styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Required title</DialogTitle>
          <DialogDescription data-testid="dialog-description">Test Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const description = screen.getByTestId('dialog-description');
    expect(description.textContent, 'Should have correct text content').toBe('Test Description');
    expect(description.className, 'Should have default styling').toContain('text-muted-foreground');
  });

  it('applies custom className to DialogDescription correctly', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Required title</DialogTitle>
          <DialogDescription className="custom-desc-class" data-testid="dialog-description">
            Test Description
          </DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const description = screen.getByTestId('dialog-description');
    expect(description.className, 'Should have custom class').toContain('custom-desc-class');
  });

  it('tests Dialog structure with all components', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent data-testid="dialog-content">
          <DialogHeader data-testid="dialog-header">
            <DialogTitle data-testid="dialog-title">Testing Dialog</DialogTitle>
            <DialogDescription data-testid="dialog-description">
              This is a dialog description
            </DialogDescription>
          </DialogHeader>
          <div>Dialog body content</div>
          <DialogFooter data-testid="dialog-footer">
            <button type="button">Cancel</button>
            <button type="button">Confirm</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const content = screen.getByTestId('dialog-content');
    expect(content, 'Dialog content should be rendered').toBeTruthy();

    const title = within(content).getByTestId('dialog-title');
    expect(title, 'Dialog title should be rendered').toBeTruthy();
    expect(title.textContent, 'Title should have correct text').toBe('Testing Dialog');

    const description = within(content).getByTestId('dialog-description');
    expect(description, 'Dialog description should be rendered').toBeTruthy();
    expect(description.textContent, 'Description should have correct text').toBe(
      'This is a dialog description',
    );
  });

  it('tests dialog components with custom classes', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent data-testid="dialog-content">
          <DialogHeader>
            <DialogTitle className="custom-title-class" data-testid="custom-title">
              Custom Title
            </DialogTitle>
            <DialogDescription className="custom-desc-class" data-testid="custom-desc">
              Custom Description
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    const title = screen.getByTestId('custom-title');
    expect(title.className, 'Title should have custom class').toContain('custom-title-class');

    const description = screen.getByTestId('custom-desc');
    expect(description.className, 'Description should have custom class').toContain(
      'custom-desc-class',
    );
  });

  it('renders Dialog with a trigger button', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog-content">
          <DialogTitle>Required Title</DialogTitle>
          <DialogDescription>Required Description</DialogDescription>
          <div>Dialog Content</div>
        </DialogContent>
      </Dialog>,
    );

    const dialogContent = screen.getByTestId('dialog-content');
    expect(dialogContent, 'Dialog content should be rendered').toBeTruthy();
  });

  it('applies a custom className to DialogHeader', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Required Title</DialogTitle>
          <DialogDescription>Required Description</DialogDescription>
          <DialogHeader className="custom-header-class" data-testid="dialog-header">
            Header Content
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    const dialogHeader = screen.getByTestId('dialog-header');
    expect(dialogHeader.className, 'Should have custom class').toContain('custom-header-class');
  });

  it('applies a custom className to DialogFooter', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Required Title</DialogTitle>
          <DialogDescription>Required Description</DialogDescription>
          <DialogFooter className="custom-footer-class" data-testid="dialog-footer">
            Footer Content
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const dialogFooter = screen.getByTestId('dialog-footer');
    expect(dialogFooter.className, 'Should have custom class').toContain('custom-footer-class');
  });

  it('renders DialogTitle with correct HTML structure and styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle data-testid="dialog-title">Test Title</DialogTitle>
          <DialogDescription>Required Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const dialogTitle = screen.getByTestId('dialog-title');
    expect(dialogTitle.textContent, 'Should render title text').toBe('Test Title');
    expect(
      dialogTitle.className.includes('text-xl') && dialogTitle.className.includes('font-semibold'),
      'Should have default styling',
    ).toBeTruthy();
  });

  it('renders DialogDescription with correct HTML structure and styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Required Title</DialogTitle>
          <DialogDescription data-testid="dialog-description">Test Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const dialogDescription = screen.getByTestId('dialog-description');
    expect(dialogDescription.textContent, 'Should render description text').toBe(
      'Test Description',
    );
    expect(dialogDescription.className, 'Should have default styling').toContain(
      'text-muted-foreground',
    );
  });

  it('applies a custom className to DialogTitle', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle className="custom-title-class" data-testid="dialog-title">
            Title Content
          </DialogTitle>
          <DialogDescription>Required description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const dialogTitle = screen.getByTestId('dialog-title');
    expect(dialogTitle.className, 'Should have custom class').toContain('custom-title-class');
  });

  it('applies a custom className to DialogDescription', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Required title</DialogTitle>
          <DialogDescription className="custom-description-class" data-testid="dialog-description">
            Description Content
          </DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const dialogDescription = screen.getByTestId('dialog-description');
    expect(dialogDescription.className, 'Should have custom class').toContain(
      'custom-description-class',
    );
  });

  it('renders a dialog with all the components', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog-content">
          <DialogHeader data-testid="dialog-header">
            <DialogTitle data-testid="dialog-title">Dialog Title</DialogTitle>
            <DialogDescription data-testid="dialog-description">
              Dialog Description
            </DialogDescription>
          </DialogHeader>
          <div>Main Content</div>
          <DialogFooter data-testid="dialog-footer">
            <button type="button">Footer Button</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    // Verify that all components render
    expect(screen.getByTestId('dialog-content'), 'Dialog content should be rendered').toBeTruthy();
    expect(screen.getByTestId('dialog-header'), 'Dialog header should be rendered').toBeTruthy();
    expect(screen.getByTestId('dialog-title'), 'Dialog title should be rendered').toBeTruthy();
    expect(
      screen.getByTestId('dialog-description'),
      'Dialog description should be rendered',
    ).toBeTruthy();
    expect(screen.getByTestId('dialog-footer'), 'Dialog footer should be rendered').toBeTruthy();

    // Check the structure is correct
    const dialogContent = screen.getByTestId('dialog-content');
    const dialogHeader = screen.getByTestId('dialog-header');
    const dialogFooter = screen.getByTestId('dialog-footer');

    expect(
      dialogHeader.parentNode === dialogContent,
      'Header should be a direct child of content',
    ).toBeTruthy();
    expect(
      dialogFooter.parentNode === dialogContent,
      'Footer should be a direct child of content',
    ).toBeTruthy();
  });
});
