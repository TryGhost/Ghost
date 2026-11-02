import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  EmptyCard,
} from '../../../../src/components/ui/card';
import { render } from '../../utils/test-utils';

describe('Card Components', () => {
  it('renders Card with default outline variant', () => {
    render(<Card data-testid="card">Card Content</Card>);
    const card = screen.getByTestId('card');

    expect(card, 'Card should be rendered').toBeTruthy();
    expect(card.textContent, 'Card should render its content').toBe('Card Content');
    expect(card.className, 'Should have outline variant styling').toContain(
      'rounded-xl border border-border-default',
    );
  });

  it('renders Card with plain variant', () => {
    render(
      <Card data-testid="card" variant="plain">
        Card Content
      </Card>,
    );
    const card = screen.getByTestId('card');

    expect(card, 'Card should be rendered').toBeTruthy();
    expect(card.className, 'Should not have outline variant styling').not.toContain(
      'rounded-xl border',
    );
  });

  it('applies custom className to Card correctly', () => {
    render(
      <Card className="custom-card-class" data-testid="card">
        Card Content
      </Card>,
    );
    const card = screen.getByTestId('card');

    expect(card.className, 'Should have custom class').toContain('custom-card-class');
  });

  it('renders EmptyCard with the default container border', () => {
    render(<EmptyCard data-testid="empty-card">Empty Card</EmptyCard>);

    const card = screen.getByTestId('empty-card');
    expect(card.className, 'Should use the default container border').toContain(
      'border border-border-default',
    );
  });

  it('renders CardHeader with correct styling based on Card variant', () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="card-header">Header Content</CardHeader>
      </Card>,
    );

    const header = screen.getByTestId('card-header');
    expect(header, 'CardHeader should be rendered').toBeTruthy();
    expect(header.textContent, 'CardHeader should render its content').toBe('Header Content');
    expect(header.className, 'Header should have appropriate padding').toContain('p-6');
  });

  it('renders CardHeader with plain variant styling', () => {
    render(
      <Card data-testid="card" variant="plain">
        <CardHeader data-testid="card-header">Header Content</CardHeader>
      </Card>,
    );

    const header = screen.getByTestId('card-header');
    expect(header.className, 'Should have plain variant styling').toContain(
      'border-b border-border-default py-5',
    );
  });

  it('renders CardTitle with correct styling', () => {
    render(<CardTitle data-testid="card-title">Card Title</CardTitle>);

    const title = screen.getByTestId('card-title');
    expect(title, 'CardTitle should be rendered').toBeTruthy();
    expect(title.textContent, 'CardTitle should render its content').toBe('Card Title');
    expect(title.className, 'Should have correct styling').toContain('font-semibold');
  });

  it('renders CardDescription with correct styling', () => {
    render(<CardDescription data-testid="card-description">Card Description</CardDescription>);

    const description = screen.getByTestId('card-description');
    expect(description, 'CardDescription should be rendered').toBeTruthy();
    expect(description.textContent, 'CardDescription should render its content').toBe(
      'Card Description',
    );
    expect(description.className, 'Should have correct styling').toContain('text-muted-foreground');
  });

  it('renders CardContent with correct styling based on Card variant', () => {
    render(
      <Card data-testid="card">
        <CardContent data-testid="card-content">Content</CardContent>
      </Card>,
    );

    const content = screen.getByTestId('card-content');
    expect(content, 'CardContent should be rendered').toBeTruthy();
    expect(content.textContent, 'CardContent should render its content').toBe('Content');
    expect(content.className, 'Should have outline variant styling').toContain('p-6 pt-0');
  });

  it('renders CardContent with plain variant styling', () => {
    render(
      <Card data-testid="card" variant="plain">
        <CardContent data-testid="card-content">Content</CardContent>
      </Card>,
    );

    const content = screen.getByTestId('card-content');
    expect(content.className, 'Should have plain variant styling').toContain(
      'border-b border-border-default',
    );
  });

  it('renders CardFooter with correct styling based on Card variant', () => {
    render(
      <Card data-testid="card">
        <CardFooter data-testid="card-footer">Footer Content</CardFooter>
      </Card>,
    );

    const footer = screen.getByTestId('card-footer');
    expect(footer, 'CardFooter should be rendered').toBeTruthy();
    expect(footer.textContent, 'CardFooter should render its content').toBe('Footer Content');
    expect(footer.className, 'Should have outline variant styling').toContain('p-6 pt-0');
  });

  it('renders CardFooter with plain variant styling', () => {
    render(
      <Card data-testid="card" variant="plain">
        <CardFooter data-testid="card-footer">Footer Content</CardFooter>
      </Card>,
    );

    const footer = screen.getByTestId('card-footer');
    expect(footer.className, 'Should have plain variant styling').toContain('py-5');
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
      </Card>,
    );

    expect(screen.getByTestId('card'), 'Card should be rendered').toBeTruthy();
    expect(screen.getByTestId('card-header'), 'CardHeader should be rendered').toBeTruthy();
    expect(screen.getByTestId('card-title'), 'CardTitle should be rendered').toBeTruthy();
    expect(
      screen.getByTestId('card-description'),
      'CardDescription should be rendered',
    ).toBeTruthy();
    expect(screen.getByTestId('card-content'), 'CardContent should be rendered').toBeTruthy();
    expect(screen.getByTestId('card-footer'), 'CardFooter should be rendered').toBeTruthy();
  });
});
