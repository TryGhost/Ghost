import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

const GHOST_CARDS_PATH = resolve(__dirname, '../../ghost/core/core/frontend/src/cards');


// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    resolve: {
        alias: {
            '@ghost-cards': GHOST_CARDS_PATH
        }
    }
});
