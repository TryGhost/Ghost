import {useNavigate} from 'react-router-dom';

declare global {
    interface Window {
        navigate: (path: string) => void;
    }
}

const Navigator = () => {
    const navigate = useNavigate();

    // Hack, used to allow Playwright to navigate without triggering a full page reload.
    window.navigate = navigate;

    return null;
};

export default Navigator;
