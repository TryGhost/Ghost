import {render, screen} from '@testing-library/react';
import Koenig from './components/Koenig';

test('renders "Strong" button in toolbar', () => {
    render(<Koenig />);

    const strongButton = screen.getByText(/Strong/i);
    expect(strongButton).toBeInTheDocument();
});
