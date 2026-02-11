import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import {resolve} from 'path';

export default defineConfig({
    plugins: [react(), svgr()],
    base: '/public-apps/',
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            input: {
                loader: resolve(__dirname, 'src/loader.ts')
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: (chunkInfo) => {
                    // Give meaningful names to feature chunks
                    if (chunkInfo.facadeModuleId?.includes('features/announcement')) {
                        return 'announcement.[hash].js';
                    }
                    if (chunkInfo.facadeModuleId?.includes('features/search')) {
                        return 'search.[hash].js';
                    }
                    if (chunkInfo.facadeModuleId?.includes('features/comments')) {
                        return 'comments.[hash].js';
                    }
                    return '[name].[hash].js';
                },
                assetFileNames: (assetInfo) => {
                    // Keep original names for CSS assets
                    return '[name].[hash][extname]';
                },
                // Code splitting - React in separate chunk shared by all features
                manualChunks: {
                    'react-vendor': ['react', 'react-dom']
                }
            }
        }
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    }
});
