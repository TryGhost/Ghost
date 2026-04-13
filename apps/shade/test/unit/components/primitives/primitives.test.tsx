import assert from 'assert/strict';
import {describe, it} from 'vitest';
import {
    Box,
    Container,
    Grid,
    Inline,
    Stack,
    Text
} from '../../../../src/components/primitives';
import {screen} from '../../utils/test-utils';
import {render} from '../../utils/test-utils';

describe('Primitives', () => {
    it('maps Stack props to expected classes with defaults', () => {
        render(<Stack data-testid="stack">A</Stack>);
        const stack = screen.getByTestId('stack');

        assert.equal(stack.tagName.toLowerCase(), 'div');
        assert.ok(stack.className.includes('flex'));
        assert.ok(stack.className.includes('flex-col'));
        assert.ok(stack.className.includes('gap-3'));
        assert.ok(stack.className.includes('items-stretch'));
        assert.ok(stack.className.includes('justify-start'));
    });

    it('maps Stack custom gap/align/justify props to classes', () => {
        render(<Stack data-testid="stack" gap="xl" align="center" justify="between">A</Stack>);
        const stack = screen.getByTestId('stack');

        assert.ok(stack.className.includes('gap-6'));
        assert.ok(stack.className.includes('items-center'));
        assert.ok(stack.className.includes('justify-between'));
    });

    it('maps Inline props and defaults to expected classes', () => {
        render(<Inline data-testid="inline">A</Inline>);
        const inline = screen.getByTestId('inline');

        assert.equal(inline.tagName.toLowerCase(), 'div');
        assert.ok(inline.className.includes('flex'));
        assert.ok(inline.className.includes('flex-row'));
        assert.ok(inline.className.includes('flex-nowrap'));
        assert.ok(inline.className.includes('gap-3'));
        assert.ok(inline.className.includes('items-center'));
        assert.ok(inline.className.includes('justify-start'));
    });

    it('renders Inline polymorphically with as and maps wrap', () => {
        render(<Inline data-testid="inline" as="nav" wrap gap="sm">A</Inline>);
        const inline = screen.getByTestId('inline');

        assert.equal(inline.tagName.toLowerCase(), 'nav');
        assert.ok(inline.className.includes('flex-wrap'));
        assert.ok(inline.className.includes('gap-2'));
    });

    it('maps Box spacing and radius props to classes', () => {
        render(
            <Box
                data-testid="box"
                padding="lg"
                paddingX="sm"
                paddingY="xl"
                radius="full"
            >
                A
            </Box>
        );
        const box = screen.getByTestId('box');

        assert.ok(box.className.includes('p-4'));
        assert.ok(box.className.includes('px-2'));
        assert.ok(box.className.includes('py-6'));
        assert.ok(box.className.includes('rounded-full'));
    });

    it('maps Container defaults and custom props to classes', () => {
        render(<Container data-testid="container">A</Container>);
        const container = screen.getByTestId('container');

        assert.ok(container.className.includes('w-full'));
        assert.ok(container.className.includes('max-w-page'));
        assert.ok(container.className.includes('mx-auto'));

        render(
            <Container data-testid="container-custom" size="prose" centered={false} paddingX="md">
                B
            </Container>
        );
        const custom = screen.getByTestId('container-custom');

        assert.ok(custom.className.includes('max-w-prose'));
        assert.ok(custom.className.includes('px-3'));
        assert.ok(!custom.className.includes('mx-auto'));
    });

    it('maps Grid props to classes with defaults', () => {
        render(<Grid data-testid="grid">A</Grid>);
        const grid = screen.getByTestId('grid');

        assert.ok(grid.className.includes('grid'));
        assert.ok(grid.className.includes('grid-cols-1'));
        assert.ok(grid.className.includes('gap-3'));
        assert.ok(grid.className.includes('items-stretch'));
        assert.ok(grid.className.includes('justify-start'));

        render(
            <Grid data-testid="grid-custom" columns={3} gap="2xl" align="end" justify="evenly">
                B
            </Grid>
        );
        const custom = screen.getByTestId('grid-custom');

        assert.ok(custom.className.includes('grid-cols-3'));
        assert.ok(custom.className.includes('gap-8'));
        assert.ok(custom.className.includes('items-end'));
        assert.ok(custom.className.includes('justify-evenly'));
    });

    it('maps Text defaults and polymorphic props to classes', () => {
        render(<Text data-testid="text">Hello</Text>);
        const text = screen.getByTestId('text');

        assert.equal(text.tagName.toLowerCase(), 'p');
        assert.ok(text.className.includes('text-md'));
        assert.ok(text.className.includes('font-normal'));
        assert.ok(text.className.includes('text-text-primary'));
        assert.ok(text.className.includes('leading-body'));

        render(
            <Text
                data-testid="text-custom"
                as="h2"
                size="2xl"
                weight="bold"
                tone="secondary"
                leading="heading"
                truncate
            >
                Heading
            </Text>
        );
        const custom = screen.getByTestId('text-custom');

        assert.equal(custom.tagName.toLowerCase(), 'h2');
        assert.ok(custom.className.includes('text-2xl'));
        assert.ok(custom.className.includes('font-bold'));
        assert.ok(custom.className.includes('text-text-secondary'));
        assert.ok(custom.className.includes('leading-heading'));
        assert.ok(custom.className.includes('truncate'));
    });
});
