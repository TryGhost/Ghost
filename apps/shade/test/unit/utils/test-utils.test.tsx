import {describe, it, expect} from 'vitest';
import {render} from './test-utils';

describe('Test Utils', () => {
    it('render function works correctly', () => {
        const {container} = render(<div>Test</div>);
        expect(container).toBeDefined();
        expect(container.textContent).toBe('Test');
    });
}); 