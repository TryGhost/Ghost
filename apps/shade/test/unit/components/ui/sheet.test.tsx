import assert from 'assert/strict';
import {describe, it} from 'vitest';
import {screen} from '@testing-library/react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from '../../../../src/components/ui/sheet';
import {render} from '../../utils/test-utils';

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
                        <button>Cancel</button>
                        <button>Submit</button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        );

        const trigger = screen.getByTestId('sheet-trigger');
        assert.ok(trigger, 'Sheet trigger should be rendered');
        assert.equal(trigger.textContent, 'Open Sheet', 'Trigger should have correct text');
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
            </Sheet>
        );

        const header = screen.getByTestId('sheet-header');
        assert.ok(header.className.includes('custom-header-class'), 'Should have custom class');
        assert.ok(header.className.includes('flex flex-col'), 'Should have default styling');
    });

    it('applies custom className to SheetFooter correctly', () => {
        render(
            <Sheet open>
                <SheetContent>
                    <SheetTitle>Required Title</SheetTitle>
                    <SheetDescription>Required Description</SheetDescription>
                    <SheetFooter className="custom-footer-class" data-testid="sheet-footer">
                        <button>Button</button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        );

        const footer = screen.getByTestId('sheet-footer');
        assert.ok(footer.className.includes('custom-footer-class'), 'Should have custom class');
    });

    it('renders SheetTitle with correct styling', () => {
        render(
            <Sheet open>
                <SheetContent>
                    <SheetTitle data-testid="sheet-title">Test Title</SheetTitle>
                    <SheetDescription>Required description</SheetDescription>
                </SheetContent>
            </Sheet>
        );

        const title = screen.getByTestId('sheet-title');
        assert.equal(title.textContent, 'Test Title', 'Should have correct text content');
        assert.ok(title.className.includes('text-xl font-semibold'), 'Should have default styling');
    });

    it('renders SheetDescription with correct styling', () => {
        render(
            <Sheet open>
                <SheetContent>
                    <SheetTitle>Required title</SheetTitle>
                    <SheetDescription data-testid="sheet-description">
                        Test Description
                    </SheetDescription>
                </SheetContent>
            </Sheet>
        );

        const description = screen.getByTestId('sheet-description');
        assert.equal(description.textContent, 'Test Description', 'Should have correct text content');
        assert.ok(description.className.includes('text-sm text-muted-foreground'), 'Should have default styling');
    });

    it('renders a Sheet with all components properly nested', () => {
        render(
            <Sheet open>
                <SheetContent data-testid="sheet-content">
                    <SheetHeader data-testid="sheet-header">
                        <SheetTitle data-testid="sheet-title">Sheet Title</SheetTitle>
                        <SheetDescription data-testid="sheet-description">
                            Sheet Description
                        </SheetDescription>
                    </SheetHeader>
                    <div>Main Content</div>
                    <SheetFooter data-testid="sheet-footer">
                        <button>Footer Button</button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        );

        // Verify that all components render
        assert.ok(screen.getByTestId('sheet-content'), 'Sheet content should be rendered');
        assert.ok(screen.getByTestId('sheet-header'), 'Sheet header should be rendered');
        assert.ok(screen.getByTestId('sheet-title'), 'Sheet title should be rendered');
        assert.ok(screen.getByTestId('sheet-description'), 'Sheet description should be rendered');
        assert.ok(screen.getByTestId('sheet-footer'), 'Sheet footer should be rendered');
    });
});