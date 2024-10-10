import ListPage from '../../src/ListPage';
import {render, screen} from '@testing-library/react';

describe.skip('Demo', function () {
    it('renders a component', async function () {
        render(<ListPage />);

        expect(screen.getAllByRole('heading')[0].textContent).toEqual('AdminX Demo App');
    });
});
