import ListIndex from '../../src/components/ListIndex';
import {render, screen} from '@testing-library/react';

describe('Demo', function () {
    it('renders a component', async function () {
        render(<ListIndex/>);

        expect(screen.getAllByRole('heading')[0].textContent).toEqual('ActivityPub Demo');
    });
});
