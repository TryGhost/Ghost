import {AddonNodeComponent} from '../../src/nodes/AddonNode';
import {render, screen} from '@testing-library/react';

describe('AddonNodeComponent', function () {
    it('shows the saved snapshot in a non-interactive iframe', function () {
        render(<AddonNodeComponent dataset={{
            id: 'block-1',
            addonHandle: 'transistor',
            blockName: 'episode-player',
            label: 'Transistor podcast player',
            props: {},
            html: '<article>Episode 12</article>',
            css: 'article { color: rebeccapurple; }',
            portableHtml: '',
            resourceOrigins: [],
            initialHeight: 240
        }} />);

        const iframe = screen.getByTitle('Transistor podcast player');
        expect(iframe).toHaveAttribute('sandbox', '');
        expect(iframe).toHaveAttribute('tabindex', '-1');
        expect(iframe).toHaveStyle({height: '240px', pointerEvents: 'none'});
        expect(iframe.getAttribute('srcdoc')).toContain('<article>Episode 12</article>');
        expect(iframe.getAttribute('srcdoc')).not.toContain('ghost-addon-bootstrap');
    });
});
