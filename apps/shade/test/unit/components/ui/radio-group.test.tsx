import assert from 'assert/strict';
import {describe, it} from 'vitest';
import {screen} from '@testing-library/react';

import {RadioGroup, RadioGroupItem} from '../../../../src/components/ui/radio-group';
import {render} from '../../utils/test-utils';

describe('RadioGroup Components', () => {
    it('uses the strong semantic border while preserving state styling', () => {
        render(
            <RadioGroup aria-label='Visibility'>
                <RadioGroupItem aria-label='Public' value='public' />
            </RadioGroup>
        );

        const radio = screen.getByRole('radio', {name: 'Public'});

        assert.match(radio.className, /border-border-strong/);
        assert.doesNotMatch(radio.className, /border-control-border/);
        assert.match(radio.className, /data-\[state=checked\]:border-primary/);
        assert.match(radio.className, /focus-visible:border-focus-ring/);
        assert.match(radio.className, /aria-\[invalid=true\]:border-destructive/);
        assert.match(radio.className, /disabled:opacity-50/);
    });
});
