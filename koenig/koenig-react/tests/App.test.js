import {render, screen} from '@testing-library/react';
import App from '../src/App';

test('renders component entrypoint', () => {
    render(<App />);

    const container = screen.queryByTestId('koenig-editor');
    expect(container).toBeInTheDocument();
});
