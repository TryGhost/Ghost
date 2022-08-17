import {render, screen} from '@testing-library/react';
import Toolbar from '../../../components/toolbar/Toolbar';

test('renders Toolbar', async () => {
    render(<Toolbar />);
    const toolbar = await screen.findAllByTestId('toolbar');
    expect(toolbar).toHaveLength(1);
});

test('toolbar opacity is 0 by default', async () => {
    render(<Toolbar />);
    const toolbar = await screen.findAllByTestId('toolbar');
    expect(toolbar[0].style.opacity).toBe('0');
});
