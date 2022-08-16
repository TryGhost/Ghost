import {render, screen} from '@testing-library/react';
import Koenig from '../../src/components/Koenig';

test('renders Mobiledoc Container', () => {
    render(<Koenig />);

    const container = screen.queryByTestId('mobiledoc-container');
    expect(container).toBeInTheDocument();
});

test('renders Mobiledoc Editor', () => {
    render(<Koenig />);

    const editor = screen.queryByTestId('mobiledoc-editor');
    expect(editor).toBeInTheDocument();
});
