import './styles/index.css';
import App from './App.tsx';
import renderStandaloneApp from '@tryghost/admin-x-framework/test/render';

// Import response JSON files
import usersMe from '../test/utils/responses/ghost/users-me.json';

// Debug URL information
// eslint-disable-next-line no-console
console.log('Standalone app running at:', {
    origin: window.location.origin,
    pathname: window.location.pathname,
    href: window.location.href,
    VITE_TEST: import.meta.env.VITE_TEST
});

if (import.meta.env.VITE_TEST) {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

        // Log the request URL
        // eslint-disable-next-line no-console
        console.log('🔍 Request URL:', url);

        // Mock the ActivityPub users endpoint
        if (url.includes('/.ghost/activitypub/users/')) {
            return new Response(JSON.stringify({
                id: '1',
                handle: '@test@localhost:5173',
                name: 'Test User',
                icon: {url: null}
            }), {
                status: 200,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // For all other requests, use the original fetch
        // eslint-disable-next-line no-console
        console.log('⏩ Passing through to original fetch');
        return originalFetch(input, init);
    };
}

renderStandaloneApp(App, {});
