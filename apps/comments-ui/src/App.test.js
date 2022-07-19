import {render} from '@testing-library/react';
import App from './App';

test('renders the auth frame', () => {
    const {container} = render(<App />);
    const iframeElement = container.querySelector('iframe[data-frame="admin-auth"]');
    expect(iframeElement).toBeInTheDocument();
});
