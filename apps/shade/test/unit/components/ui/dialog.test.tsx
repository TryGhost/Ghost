import assert from 'assert/strict';
import {describe, it} from 'vitest';
import {screen, within} from '@testing-library/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '../../../../src/components/ui/dialog';
import {render} from '../../utils/test-utils';

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
                        <button>Cancel</button>
                        <button>Submit</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
        
        const trigger = screen.getByTestId('dialog-trigger');
        assert.ok(trigger, 'Dialog trigger should be rendered');
        assert.equal(trigger.textContent, 'Open Dialog', 'Trigger should have correct text');
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
            </Dialog>
        );
        
        const header = screen.getByTestId('dialog-header');
        assert.ok(header.className.includes('custom-header-class'), 'Should have custom class');
        assert.ok(header.className.includes('flex flex-col'), 'Should have default styling');
    });

    it('applies custom className to DialogFooter correctly', () => {
        render(
            <Dialog open>
                <DialogContent>
                    <DialogTitle>Required Title</DialogTitle>
                    <DialogDescription>Required Description</DialogDescription>
                    <DialogFooter className="custom-footer-class" data-testid="dialog-footer">
                        <button>Button</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
        
        const footer = screen.getByTestId('dialog-footer');
        assert.ok(footer.className.includes('custom-footer-class'), 'Should have custom class');
        assert.ok(footer.className.includes('flex flex-col-reverse'), 'Should have default styling');
    });

    it('renders DialogTitle with correct styling', () => {
        render(
            <Dialog open>
                <DialogContent>
                    <DialogTitle data-testid="dialog-title">Test Title</DialogTitle>
                    <DialogDescription>Required description</DialogDescription>
                </DialogContent>
            </Dialog>
        );
        
        const title = screen.getByTestId('dialog-title');
        assert.equal(title.tagName.toLowerCase(), 'h2', 'Should be an h2 element');
        assert.equal(title.textContent, 'Test Title', 'Should have correct text content');
        assert.ok(title.className.includes('text-xl font-semibold'), 'Should have default styling');
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
            </Dialog>
        );
        
        const title = screen.getByTestId('dialog-title');
        assert.ok(title.className.includes('custom-title-class'), 'Should have custom class');
    });

    it('renders DialogDescription with correct styling', () => {
        render(
            <Dialog open>
                <DialogContent>
                    <DialogTitle>Required title</DialogTitle>
                    <DialogDescription data-testid="dialog-description">
                        Test Description
                    </DialogDescription>
                </DialogContent>
            </Dialog>
        );
        
        const description = screen.getByTestId('dialog-description');
        assert.equal(description.textContent, 'Test Description', 'Should have correct text content');
        assert.ok(description.className.includes('text-sm text-muted-foreground'), 'Should have default styling');
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
            </Dialog>
        );
        
        const description = screen.getByTestId('dialog-description');
        assert.ok(description.className.includes('custom-desc-class'), 'Should have custom class');
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
                        <button>Cancel</button>
                        <button>Confirm</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
        
        const content = screen.getByTestId('dialog-content');
        assert.ok(content, 'Dialog content should be rendered');
        
        const title = within(content).getByTestId('dialog-title');
        assert.ok(title, 'Dialog title should be rendered');
        assert.equal(title.textContent, 'Testing Dialog', 'Title should have correct text');
        
        const description = within(content).getByTestId('dialog-description');
        assert.ok(description, 'Dialog description should be rendered');
        assert.equal(description.textContent, 'This is a dialog description', 'Description should have correct text');
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
            </Dialog>
        );
        
        const title = screen.getByTestId('custom-title');
        assert.ok(title.className.includes('custom-title-class'), 'Title should have custom class');
        
        const description = screen.getByTestId('custom-desc');
        assert.ok(description.className.includes('custom-desc-class'), 'Description should have custom class');
    });

    it('renders Dialog with a trigger button', () => {
        render(
            <Dialog open>
                <DialogContent data-testid="dialog-content">
                    <DialogTitle>Required Title</DialogTitle>
                    <DialogDescription>Required Description</DialogDescription>
                    <div>Dialog Content</div>
                </DialogContent>
            </Dialog>
        );
        
        const dialogContent = screen.getByTestId('dialog-content');
        assert.ok(dialogContent, 'Dialog content should be rendered');
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
            </Dialog>
        );
        
        const dialogHeader = screen.getByTestId('dialog-header');
        assert.ok(dialogHeader.className.includes('custom-header-class'), 'Should have custom class');
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
            </Dialog>
        );
        
        const dialogFooter = screen.getByTestId('dialog-footer');
        assert.ok(dialogFooter.className.includes('custom-footer-class'), 'Should have custom class');
    });

    it('renders DialogTitle with correct HTML structure and styling', () => {
        render(
            <Dialog open>
                <DialogContent>
                    <DialogTitle data-testid="dialog-title">Test Title</DialogTitle>
                    <DialogDescription>Required Description</DialogDescription>
                </DialogContent>
            </Dialog>
        );
        
        const dialogTitle = screen.getByTestId('dialog-title');
        assert.equal(dialogTitle.textContent, 'Test Title', 'Should render title text');
        assert.ok(dialogTitle.className.includes('text-xl font-semibold'), 'Should have default styling');
    });
    
    it('renders DialogDescription with correct HTML structure and styling', () => {
        render(
            <Dialog open>
                <DialogContent>
                    <DialogTitle>Required Title</DialogTitle>
                    <DialogDescription data-testid="dialog-description">Test Description</DialogDescription>
                </DialogContent>
            </Dialog>
        );
        
        const dialogDescription = screen.getByTestId('dialog-description');
        assert.equal(dialogDescription.textContent, 'Test Description', 'Should render description text');
        assert.ok(dialogDescription.className.includes('text-sm text-muted-foreground'), 'Should have default styling');
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
            </Dialog>
        );
        
        const dialogTitle = screen.getByTestId('dialog-title');
        assert.ok(dialogTitle.className.includes('custom-title-class'), 'Should have custom class');
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
            </Dialog>
        );
        
        const dialogDescription = screen.getByTestId('dialog-description');
        assert.ok(dialogDescription.className.includes('custom-description-class'), 'Should have custom class');
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
                        <button>Footer Button</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
        
        // Verify that all components render
        assert.ok(screen.getByTestId('dialog-content'), 'Dialog content should be rendered');
        assert.ok(screen.getByTestId('dialog-header'), 'Dialog header should be rendered');
        assert.ok(screen.getByTestId('dialog-title'), 'Dialog title should be rendered');
        assert.ok(screen.getByTestId('dialog-description'), 'Dialog description should be rendered');
        assert.ok(screen.getByTestId('dialog-footer'), 'Dialog footer should be rendered');
        
        // Check the structure is correct
        const dialogContent = screen.getByTestId('dialog-content');
        const dialogHeader = screen.getByTestId('dialog-header');
        const dialogFooter = screen.getByTestId('dialog-footer');
        
        assert.ok(dialogHeader.parentNode === dialogContent, 'Header should be a direct child of content');
        assert.ok(dialogFooter.parentNode === dialogContent, 'Footer should be a direct child of content');
    });
}); 