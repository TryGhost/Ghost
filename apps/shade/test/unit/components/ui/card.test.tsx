import assert from 'assert/strict';
import {describe, it} from 'vitest';
import {screen} from '@testing-library/react';
import {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardDescription,
    CardContent
} from '../../../../src/components/ui/card';
import {render} from '../../utils/test-utils';

describe('Card Components', () => {
    it('renders Card with default outline variant', () => {
        render(<Card data-testid="card">Card Content</Card>);
        const card = screen.getByTestId('card');

        assert.ok(card, 'Card should be rendered');
        assert.equal(card.textContent, 'Card Content', 'Card should render its content');
        assert.ok(card.className.includes('rounded-xl border'), 'Should have outline variant styling');
    });

    it('renders Card with plain variant', () => {
        render(<Card variant="plain" data-testid="card">Card Content</Card>);
        const card = screen.getByTestId('card');

        assert.ok(card, 'Card should be rendered');
        assert.ok(!card.className.includes('rounded-xl border'), 'Should not have outline variant styling');
    });

    it('applies custom className to Card correctly', () => {
        render(<Card className="custom-card-class" data-testid="card">Card Content</Card>);
        const card = screen.getByTestId('card');

        assert.ok(card.className.includes('custom-card-class'), 'Should have custom class');
    });

    it('renders CardHeader with correct styling based on Card variant', () => {
        render(
            <Card data-testid="card">
                <CardHeader data-testid="card-header">Header Content</CardHeader>
            </Card>
        );

        const header = screen.getByTestId('card-header');
        assert.ok(header, 'CardHeader should be rendered');
        assert.equal(header.textContent, 'Header Content', 'CardHeader should render its content');
        assert.ok(header.className.includes('p-6'), 'Header should have appropriate padding');
    });

    it('renders CardHeader with plain variant styling', () => {
        render(
            <Card variant="plain" data-testid="card">
                <CardHeader data-testid="card-header">Header Content</CardHeader>
            </Card>
        );

        const header = screen.getByTestId('card-header');
        assert.ok(header.className.includes('border-b py-5'), 'Should have plain variant styling');
    });

    it('renders CardTitle with correct styling', () => {
        render(<CardTitle data-testid="card-title">Card Title</CardTitle>);

        const title = screen.getByTestId('card-title');
        assert.ok(title, 'CardTitle should be rendered');
        assert.equal(title.textContent, 'Card Title', 'CardTitle should render its content');
        assert.ok(title.className.includes('font-semibold'), 'Should have correct styling');
    });

    it('renders CardDescription with correct styling', () => {
        render(<CardDescription data-testid="card-description">Card Description</CardDescription>);

        const description = screen.getByTestId('card-description');
        assert.ok(description, 'CardDescription should be rendered');
        assert.equal(description.textContent, 'Card Description', 'CardDescription should render its content');
        assert.ok(description.className.includes('text-muted-foreground'), 'Should have correct styling');
    });

    it('renders CardContent with correct styling based on Card variant', () => {
        render(
            <Card data-testid="card">
                <CardContent data-testid="card-content">Content</CardContent>
            </Card>
        );

        const content = screen.getByTestId('card-content');
        assert.ok(content, 'CardContent should be rendered');
        assert.equal(content.textContent, 'Content', 'CardContent should render its content');
        assert.ok(content.className.includes('p-6 pt-0'), 'Should have outline variant styling');
    });

    it('renders CardContent with plain variant styling', () => {
        render(
            <Card variant="plain" data-testid="card">
                <CardContent data-testid="card-content">Content</CardContent>
            </Card>
        );

        const content = screen.getByTestId('card-content');
        assert.ok(content.className.includes('border-b'), 'Should have plain variant styling');
    });

    it('renders CardFooter with correct styling based on Card variant', () => {
        render(
            <Card data-testid="card">
                <CardFooter data-testid="card-footer">Footer Content</CardFooter>
            </Card>
        );

        const footer = screen.getByTestId('card-footer');
        assert.ok(footer, 'CardFooter should be rendered');
        assert.equal(footer.textContent, 'Footer Content', 'CardFooter should render its content');
        assert.ok(footer.className.includes('p-6 pt-0'), 'Should have outline variant styling');
    });

    it('renders CardFooter with plain variant styling', () => {
        render(
            <Card variant="plain" data-testid="card">
                <CardFooter data-testid="card-footer">Footer Content</CardFooter>
            </Card>
        );

        const footer = screen.getByTestId('card-footer');
        assert.ok(footer.className.includes('py-5'), 'Should have plain variant styling');
    });

    it('renders a complete Card with all subcomponents', () => {
        render(
            <Card data-testid="card">
                <CardHeader data-testid="card-header">
                    <CardTitle data-testid="card-title">Card Title</CardTitle>
                    <CardDescription data-testid="card-description">Card Description</CardDescription>
                </CardHeader>
                <CardContent data-testid="card-content">Card Content</CardContent>
                <CardFooter data-testid="card-footer">Card Footer</CardFooter>
            </Card>
        );

        assert.ok(screen.getByTestId('card'), 'Card should be rendered');
        assert.ok(screen.getByTestId('card-header'), 'CardHeader should be rendered');
        assert.ok(screen.getByTestId('card-title'), 'CardTitle should be rendered');
        assert.ok(screen.getByTestId('card-description'), 'CardDescription should be rendered');
        assert.ok(screen.getByTestId('card-content'), 'CardContent should be rendered');
        assert.ok(screen.getByTestId('card-footer'), 'CardFooter should be rendered');
    });
});