import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../../../src/components/ui/sheet';
import { render } from '../../utils/test-utils';

describe('Sheet Components', () => {
  it('renders Sheet with trigger button correctly', () => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger data-testid="sheet-trigger">Open Sheet</SheetTrigger>
        <SheetContent data-testid="sheet-content">
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet Description</SheetDescription>
          </SheetHeader>
          <p>Sheet Content</p>
          <SheetFooter>
            <button type="button">Cancel</button>
            <button type="button">Submit</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    const trigger = screen.getByTestId('sheet-trigger');
    expect(trigger, 'Sheet trigger should be rendered').toBeTruthy();
    expect(trigger.textContent, 'Trigger should have correct text').toBe('Open Sheet');
  });

  it('applies custom className to SheetHeader correctly', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Required Title</SheetTitle>
          <SheetDescription>Required Description</SheetDescription>
          <SheetHeader className="custom-header-class" data-testid="sheet-header">
            <div>Title</div>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    const header = screen.getByTestId('sheet-header');
    expect(header.className, 'Should have custom class').toContain('custom-header-class');
    expect(header.className, 'Should have default styling').toContain('flex flex-col');
  });

  it('applies custom className to SheetFooter correctly', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Required Title</SheetTitle>
          <SheetDescription>Required Description</SheetDescription>
          <SheetFooter className="custom-footer-class" data-testid="sheet-footer">
            <button type="button">Button</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    const footer = screen.getByTestId('sheet-footer');
    expect(footer.className, 'Should have custom class').toContain('custom-footer-class');
  });

  it('renders SheetTitle with correct styling', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle data-testid="sheet-title">Test Title</SheetTitle>
          <SheetDescription>Required description</SheetDescription>
        </SheetContent>
      </Sheet>,
    );

    const title = screen.getByTestId('sheet-title');
    expect(title.textContent, 'Should have correct text content').toBe('Test Title');
    expect(title.className, 'Should have default styling').toContain('text-xl font-semibold');
  });

  it('renders SheetDescription with correct styling', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Required title</SheetTitle>
          <SheetDescription data-testid="sheet-description">Test Description</SheetDescription>
        </SheetContent>
      </Sheet>,
    );

    const description = screen.getByTestId('sheet-description');
    expect(description.textContent, 'Should have correct text content').toBe('Test Description');
    expect(description.className, 'Should have default styling').toContain(
      'text-sm text-muted-foreground',
    );
  });

  it('renders a Sheet with all components properly nested', () => {
    render(
      <Sheet open>
        <SheetContent data-testid="sheet-content">
          <SheetHeader data-testid="sheet-header">
            <SheetTitle data-testid="sheet-title">Sheet Title</SheetTitle>
            <SheetDescription data-testid="sheet-description">Sheet Description</SheetDescription>
          </SheetHeader>
          <div>Main Content</div>
          <SheetFooter data-testid="sheet-footer">
            <button type="button">Footer Button</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    // Verify that all components render
    expect(screen.getByTestId('sheet-content'), 'Sheet content should be rendered').toBeTruthy();
    expect(screen.getByTestId('sheet-header'), 'Sheet header should be rendered').toBeTruthy();
    expect(screen.getByTestId('sheet-title'), 'Sheet title should be rendered').toBeTruthy();
    expect(
      screen.getByTestId('sheet-description'),
      'Sheet description should be rendered',
    ).toBeTruthy();
    expect(screen.getByTestId('sheet-footer'), 'Sheet footer should be rendered').toBeTruthy();
  });
});
