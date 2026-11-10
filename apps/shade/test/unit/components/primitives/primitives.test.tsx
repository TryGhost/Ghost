import { describe, expect, it } from 'vitest';
import { Box, Container, Grid, Inline, Stack, Text } from '../../../../src/components/primitives';
import { screen } from '../../utils/test-utils';
import { render } from '../../utils/test-utils';

describe('Primitives', () => {
  it('maps Stack props to expected classes with defaults', () => {
    render(<Stack data-testid="stack">A</Stack>);
    const stack = screen.getByTestId('stack');

    expect(stack.tagName.toLowerCase()).toBe('div');
    expect(stack.className).toContain('flex');
    expect(stack.className).toContain('flex-col');
    expect(stack.className).toContain('gap-3');
    expect(stack.className).toContain('items-stretch');
    expect(stack.className).toContain('justify-start');
  });

  it('maps Stack custom gap/align/justify props to classes', () => {
    render(
      <Stack align="center" data-testid="stack" gap="xl" justify="between">
        A
      </Stack>,
    );
    const stack = screen.getByTestId('stack');

    expect(stack.className).toContain('gap-6');
    expect(stack.className).toContain('items-center');
    expect(stack.className).toContain('justify-between');
  });

  it('maps Inline props and defaults to expected classes', () => {
    render(<Inline data-testid="inline">A</Inline>);
    const inline = screen.getByTestId('inline');

    expect(inline.tagName.toLowerCase()).toBe('div');
    expect(inline.className).toContain('flex');
    expect(inline.className).toContain('flex-row');
    expect(inline.className).toContain('flex-nowrap');
    expect(inline.className).toContain('gap-3');
    expect(inline.className).toContain('items-center');
    expect(inline.className).toContain('justify-start');
  });

  it('renders Inline polymorphically with as and maps wrap', () => {
    render(
      <Inline as="nav" data-testid="inline" gap="sm" wrap>
        A
      </Inline>,
    );
    const inline = screen.getByTestId('inline');

    expect(inline.tagName.toLowerCase()).toBe('nav');
    expect(inline.className).toContain('flex-wrap');
    expect(inline.className).toContain('gap-2');
  });

  it('maps Box spacing and radius props to classes', () => {
    render(
      <Box data-testid="box" padding="lg" paddingX="sm" paddingY="xl" radius="full">
        A
      </Box>,
    );
    const box = screen.getByTestId('box');

    expect(box.className).toContain('p-5');
    expect(box.className).toContain('px-2');
    expect(box.className).toContain('py-6');
    expect(box.className).toContain('rounded-full');
  });

  it('maps Container defaults and custom props to classes', () => {
    render(<Container data-testid="container">A</Container>);
    const container = screen.getByTestId('container');

    expect(container.className).toContain('w-full');
    expect(container.className).toContain('max-w-page');
    expect(container.className).toContain('mx-auto');

    render(
      <Container centered={false} data-testid="container-custom" paddingX="md" size="prose">
        B
      </Container>,
    );
    const custom = screen.getByTestId('container-custom');

    expect(custom.className).toContain('max-w-prose');
    expect(custom.className).toContain('px-3');
    expect(custom.className).not.toContain('mx-auto');
  });

  it('maps Grid props to classes with defaults', () => {
    render(<Grid data-testid="grid">A</Grid>);
    const grid = screen.getByTestId('grid');

    expect(grid.className).toContain('grid');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('gap-3');
    expect(grid.className).toContain('items-stretch');
    expect(grid.className).toContain('justify-start');

    render(
      <Grid align="end" columns={3} data-testid="grid-custom" gap="2xl" justify="evenly">
        B
      </Grid>,
    );
    const custom = screen.getByTestId('grid-custom');

    expect(custom.className).toContain('grid-cols-3');
    expect(custom.className).toContain('gap-8');
    expect(custom.className).toContain('items-end');
    expect(custom.className).toContain('justify-evenly');
  });

  it('maps Text defaults and polymorphic props to classes', () => {
    render(<Text data-testid="text">Hello</Text>);
    const text = screen.getByTestId('text');

    expect(text.tagName.toLowerCase()).toBe('p');
    expect(text.className).toContain('text-md');
    expect(text.className).toContain('font-normal');
    expect(text.className).toContain('text-text-primary');
    expect(text.className).toContain('leading-body');

    render(
      <Text
        as="h2"
        data-testid="text-custom"
        leading="heading"
        size="2xl"
        tone="secondary"
        weight="bold"
        truncate
      >
        Heading
      </Text>,
    );
    const custom = screen.getByTestId('text-custom');

    expect(custom.tagName.toLowerCase()).toBe('h2');
    expect(custom.className).toContain('text-2xl');
    expect(custom.className).toContain('font-bold');
    expect(custom.className).toContain('text-text-secondary');
    expect(custom.className).toContain('leading-heading');
    expect(custom.className).toContain('truncate');
  });
});
