import assert from 'assert/strict';
import {describe, it} from 'vitest';
import {screen} from '@testing-library/react';

import {Checkbox} from '../../../../src/components/ui/checkbox';
import {render} from '../../utils/test-utils';

describe('Checkbox Component', () => {
    it('uses the strong semantic border while preserving state styling', () => {
        render(<Checkbox aria-label='Visibility' />);

        const checkbox = screen.getByRole('checkbox', {name: 'Visibility'});

        assert.match(checkbox.className, /border-border-strong/);
        assert.doesNotMatch(checkbox.className, /border-control-border/);
        assert.match(checkbox.className, /data-\[state=checked\]:border-primary/);
        assert.match(checkbox.className, /focus-visible:border-focus-ring/);
        assert.match(checkbox.className, /aria-\[invalid=true\]:border-destructive/);
        assert.match(checkbox.className, /disabled:opacity-50/);
    });
});
