import {useNavigate} from 'react-router-dom';

const Navigator = () => {
    const navigate = useNavigate();

    // Hack, used to allow Playwright to navigate without triggering a full page reload.
    window.navigate = navigate;

    return null;
};

export default Navigator;
