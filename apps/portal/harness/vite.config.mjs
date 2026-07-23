import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import {defineConfig} from 'vite';

export default defineConfig({
    root: import.meta.dirname,
    plugins: [react(), svgr()],
    define: {
        REACT_APP_VERSION: JSON.stringify('harness')
    },
    server: {
        port: 5199,
        strictPort: true
    }
});
