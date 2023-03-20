// vite.config.js
import { resolve } from "path";
import { defineConfig } from "file:///Users/ronaldlangeveld/Dev/Ghost/forks/Koenig/node_modules/vitest/dist/config.js";
import react from "file:///Users/ronaldlangeveld/Dev/Ghost/forks/Koenig/node_modules/@vitejs/plugin-react/dist/index.mjs";
import svgr from "file:///Users/ronaldlangeveld/Dev/Ghost/forks/Koenig/node_modules/vite-plugin-svgr/dist/index.mjs";

// package.json
var package_default = {
  name: "@tryghost/koenig-lexical",
  version: "0.0.60",
  repository: "https://github.com/TryGhost/Koenig/tree/master/packages/koenig-lexical",
  author: "Ghost Foundation",
  license: "MIT",
  type: "module",
  files: [
    "LICENSE",
    "README.md",
    "dist/"
  ],
  main: "./dist/koenig-lexical.umd.cjs",
  module: "./dist/koenig-lexical.js",
  exports: {
    ".": {
      import: "./dist/koenig-lexical.js",
      require: "./dist/koenig-lexical.umd.cjs"
    }
  },
  scripts: {
    dev: "vite",
    build: "vite build",
    "build:demo": "vite build --config vite.config.demo.js",
    preview: "vite preview",
    pretest: "VITE_TEST=true yarn build --config vite.config.demo.js",
    test: "vitest run",
    "test:headed": "PLAYWRIGHT_HEADLESS=false vitest run",
    "test:slowmo": "PLAYWRIGHT_SLOWMO=100 PLAYWRIGHT_HEADLESS=false vitest run",
    "pretest:watch": "yarn pretest",
    "test:watch": "vitest",
    posttest: "yarn lint",
    coverage: "vitest run --coverage",
    lint: "eslint --ext .js,.cjs,.jsx --cache demo src test",
    prepare: "NODE_ENV=production yarn build",
    storybook: "NODE_OPTIONS=--openssl-legacy-provider start-storybook -p 6006 -h 127.0.0.1",
    "build-storybook": "build-storybook"
  },
  dependencies: {
    "@codemirror/lang-css": "^6.0.2",
    "@codemirror/lang-html": "^6.4.1",
    "@codemirror/lang-javascript": "^6.1.2",
    "@lexical/list": "^0.9.0",
    "@lexical/react": "^0.9.0",
    "@lexical/selection": "^0.9.0",
    "@lexical/text": "^0.9.0",
    "@lexical/utils": "^0.9.0",
    "@lezer/highlight": "^1.1.3",
    "@picmo/popup-picker": "^5.8.1",
    "@tryghost/kg-clean-basic-html": "^3.0.7",
    "@tryghost/kg-default-nodes": "^0.0.16",
    "@tryghost/kg-markdown-html-renderer": "^6.0.5",
    "@tryghost/kg-simplemde": "^2.0.9",
    "@uiw/react-codemirror": "^4.19.6",
    codemirror: "^6.0.1",
    dompurify: "^3.0.0",
    "emoji-picker-react": "^4.4.7",
    eventemitter3: "^5.0.0",
    lexical: "^0.9.0",
    "lodash-es": "^4.17.21",
    picmo: "^5.8.1",
    pluralize: "^8.0.0",
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    vite: "^4.1.4"
  },
  devDependencies: {
    "@babel/core": "7.21.3",
    "@etchteam/storybook-addon-status": "^4.2.2",
    "@playwright/test": "^1.30.0",
    "@storybook/addon-actions": "6.5.16",
    "@storybook/addon-essentials": "6.5.16",
    "@storybook/addon-interactions": "6.5.16",
    "@storybook/addon-links": "6.5.16",
    "@storybook/builder-vite": "0.4.2",
    "@storybook/react": "6.5.16",
    "@storybook/testing-library": "0.0.13",
    "@tailwindcss/line-clamp": "0.4.2",
    "@testing-library/jest-dom": "5.16.5",
    "@testing-library/react": "14.0.0",
    "@types/react": "18.0.28",
    "@types/react-dom": "18.0.11",
    "@vitejs/plugin-react": "2.2.0",
    "@vitest/coverage-c8": "0.29.3",
    "@vitest/ui": "0.29.3",
    autoprefixer: "10.4.14",
    "babel-loader": "9.1.2",
    "cross-fetch": "^3.1.5",
    "eslint-config-react-app": "7.0.1",
    "eslint-plugin-jest": "27.2.1",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-tailwindcss": "3.10.1",
    jsdom: "21.1.1",
    playwright: "1.31.2",
    postcss: "8.4.21",
    "postcss-import": "15.1.0",
    prettier: "2.8.4",
    "react-highlight": "^0.15.0",
    "react-router-dom": "6.9.0",
    tailwindcss: "3.2.7",
    typescript: "4.9.5",
    vite: "3.0.8",
    "vite-plugin-svgr": "2.4.0",
    vitest: "0.29.3"
  }
};

// vite.config.js
var __vite_injected_original_dirname = "/Users/ronaldlangeveld/Dev/Ghost/forks/Koenig/packages/koenig-lexical";
var outputFileName = package_default.name[0] === "@" ? package_default.name.slice(package_default.name.indexOf("/") + 1) : package_default.name;
var vite_config_default = defineConfig({
  plugins: [
    svgr(),
    react()
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    "process.env.VITEST_SEGFAULT_RETRY": 3
  },
  optimizeDeps: {
    include: [
      "@tryghost/kg-clean-basic-html",
      "@tryghost/kg-markdown-html-renderer",
      "@tryghost/kg-simplemde"
    ]
  },
  build: {
    minify: true,
    sourcemap: true,
    cssCodeSplit: true,
    lib: {
      entry: resolve(__vite_injected_original_dirname, "src/index.js"),
      name: package_default.name,
      fileName(format) {
        if (format === "umd") {
          return `${outputFileName}.umd.js`;
        }
        return `${outputFileName}.js`;
      }
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM"
        }
      }
    },
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    }
  },
  test: {
    globals: true,
    // required for @testing-library/jest-dom extensions
    environment: "jsdom",
    setupFiles: "./test/test-setup.js",
    globalSetup: "./test/e2e-setup.js",
    testTimeout: 1e4
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3JvbmFsZGxhbmdldmVsZC9EZXYvR2hvc3QvZm9ya3MvS29lbmlnL3BhY2thZ2VzL2tvZW5pZy1sZXhpY2FsXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvcm9uYWxkbGFuZ2V2ZWxkL0Rldi9HaG9zdC9mb3Jrcy9Lb2VuaWcvcGFja2FnZXMva29lbmlnLWxleGljYWwvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3JvbmFsZGxhbmdldmVsZC9EZXYvR2hvc3QvZm9ya3MvS29lbmlnL3BhY2thZ2VzL2tvZW5pZy1sZXhpY2FsL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHtyZXNvbHZlfSBmcm9tICdwYXRoJztcbmltcG9ydCB7ZGVmaW5lQ29uZmlnfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgc3ZnciBmcm9tICd2aXRlLXBsdWdpbi1zdmdyJztcbmltcG9ydCBwa2cgZnJvbSAnLi9wYWNrYWdlLmpzb24nO1xuXG5jb25zdCBvdXRwdXRGaWxlTmFtZSA9IHBrZy5uYW1lWzBdID09PSAnQCcgPyBwa2cubmFtZS5zbGljZShwa2cubmFtZS5pbmRleE9mKCcvJykgKyAxKSA6IHBrZy5uYW1lO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICAgIHN2Z3IoKSxcbiAgICAgICAgcmVhY3QoKVxuICAgIF0sXG4gICAgZGVmaW5lOiB7XG4gICAgICAgICdwcm9jZXNzLmVudi5OT0RFX0VOVic6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lk5PREVfRU5WKSxcbiAgICAgICAgJ3Byb2Nlc3MuZW52LlZJVEVTVF9TRUdGQVVMVF9SRVRSWSc6IDNcbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgICBpbmNsdWRlOiBbXG4gICAgICAgICAgICAnQHRyeWdob3N0L2tnLWNsZWFuLWJhc2ljLWh0bWwnLFxuICAgICAgICAgICAgJ0B0cnlnaG9zdC9rZy1tYXJrZG93bi1odG1sLXJlbmRlcmVyJyxcbiAgICAgICAgICAgICdAdHJ5Z2hvc3Qva2ctc2ltcGxlbWRlJ1xuICAgICAgICBdXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgICBtaW5pZnk6IHRydWUsXG4gICAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICAgICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxuICAgICAgICBsaWI6IHtcbiAgICAgICAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9pbmRleC5qcycpLFxuICAgICAgICAgICAgbmFtZTogcGtnLm5hbWUsXG4gICAgICAgICAgICBmaWxlTmFtZShmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZm9ybWF0ID09PSAndW1kJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYCR7b3V0cHV0RmlsZU5hbWV9LnVtZC5qc2A7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke291dHB1dEZpbGVOYW1lfS5qc2A7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgIGV4dGVybmFsOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgZ2xvYmFsczoge1xuICAgICAgICAgICAgICAgICAgICByZWFjdDogJ1JlYWN0JyxcbiAgICAgICAgICAgICAgICAgICAgJ3JlYWN0LWRvbSc6ICdSZWFjdERPTSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNvbW1vbmpzT3B0aW9uczoge1xuICAgICAgICAgICAgaW5jbHVkZTogWy9wYWNrYWdlcy8sIC9ub2RlX21vZHVsZXMvXVxuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OiB7XG4gICAgICAgIGdsb2JhbHM6IHRydWUsIC8vIHJlcXVpcmVkIGZvciBAdGVzdGluZy1saWJyYXJ5L2plc3QtZG9tIGV4dGVuc2lvbnNcbiAgICAgICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgICAgIHNldHVwRmlsZXM6ICcuL3Rlc3QvdGVzdC1zZXR1cC5qcycsXG4gICAgICAgIGdsb2JhbFNldHVwOiAnLi90ZXN0L2UyZS1zZXR1cC5qcycsXG4gICAgICAgIHRlc3RUaW1lb3V0OiAxMDAwMFxuICAgIH1cbn0pO1xuIiwgIntcbiAgXCJuYW1lXCI6IFwiQHRyeWdob3N0L2tvZW5pZy1sZXhpY2FsXCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMC42MFwiLFxuICBcInJlcG9zaXRvcnlcIjogXCJodHRwczovL2dpdGh1Yi5jb20vVHJ5R2hvc3QvS29lbmlnL3RyZWUvbWFzdGVyL3BhY2thZ2VzL2tvZW5pZy1sZXhpY2FsXCIsXG4gIFwiYXV0aG9yXCI6IFwiR2hvc3QgRm91bmRhdGlvblwiLFxuICBcImxpY2Vuc2VcIjogXCJNSVRcIixcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gIFwiZmlsZXNcIjogW1xuICAgIFwiTElDRU5TRVwiLFxuICAgIFwiUkVBRE1FLm1kXCIsXG4gICAgXCJkaXN0L1wiXG4gIF0sXG4gIFwibWFpblwiOiBcIi4vZGlzdC9rb2VuaWctbGV4aWNhbC51bWQuY2pzXCIsXG4gIFwibW9kdWxlXCI6IFwiLi9kaXN0L2tvZW5pZy1sZXhpY2FsLmpzXCIsXG4gIFwiZXhwb3J0c1wiOiB7XG4gICAgXCIuXCI6IHtcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9kaXN0L2tvZW5pZy1sZXhpY2FsLmpzXCIsXG4gICAgICBcInJlcXVpcmVcIjogXCIuL2Rpc3Qva29lbmlnLWxleGljYWwudW1kLmNqc1wiXG4gICAgfVxuICB9LFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiZGV2XCI6IFwidml0ZVwiLFxuICAgIFwiYnVpbGRcIjogXCJ2aXRlIGJ1aWxkXCIsXG4gICAgXCJidWlsZDpkZW1vXCI6IFwidml0ZSBidWlsZCAtLWNvbmZpZyB2aXRlLmNvbmZpZy5kZW1vLmpzXCIsXG4gICAgXCJwcmV2aWV3XCI6IFwidml0ZSBwcmV2aWV3XCIsXG4gICAgXCJwcmV0ZXN0XCI6IFwiVklURV9URVNUPXRydWUgeWFybiBidWlsZCAtLWNvbmZpZyB2aXRlLmNvbmZpZy5kZW1vLmpzXCIsXG4gICAgXCJ0ZXN0XCI6IFwidml0ZXN0IHJ1blwiLFxuICAgIFwidGVzdDpoZWFkZWRcIjogXCJQTEFZV1JJR0hUX0hFQURMRVNTPWZhbHNlIHZpdGVzdCBydW5cIixcbiAgICBcInRlc3Q6c2xvd21vXCI6IFwiUExBWVdSSUdIVF9TTE9XTU89MTAwIFBMQVlXUklHSFRfSEVBRExFU1M9ZmFsc2Ugdml0ZXN0IHJ1blwiLFxuICAgIFwicHJldGVzdDp3YXRjaFwiOiBcInlhcm4gcHJldGVzdFwiLFxuICAgIFwidGVzdDp3YXRjaFwiOiBcInZpdGVzdFwiLFxuICAgIFwicG9zdHRlc3RcIjogXCJ5YXJuIGxpbnRcIixcbiAgICBcImNvdmVyYWdlXCI6IFwidml0ZXN0IHJ1biAtLWNvdmVyYWdlXCIsXG4gICAgXCJsaW50XCI6IFwiZXNsaW50IC0tZXh0IC5qcywuY2pzLC5qc3ggLS1jYWNoZSBkZW1vIHNyYyB0ZXN0XCIsXG4gICAgXCJwcmVwYXJlXCI6IFwiTk9ERV9FTlY9cHJvZHVjdGlvbiB5YXJuIGJ1aWxkXCIsXG4gICAgXCJzdG9yeWJvb2tcIjogXCJOT0RFX09QVElPTlM9LS1vcGVuc3NsLWxlZ2FjeS1wcm92aWRlciBzdGFydC1zdG9yeWJvb2sgLXAgNjAwNiAtaCAxMjcuMC4wLjFcIixcbiAgICBcImJ1aWxkLXN0b3J5Ym9va1wiOiBcImJ1aWxkLXN0b3J5Ym9va1wiXG4gIH0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBjb2RlbWlycm9yL2xhbmctY3NzXCI6IFwiXjYuMC4yXCIsXG4gICAgXCJAY29kZW1pcnJvci9sYW5nLWh0bWxcIjogXCJeNi40LjFcIixcbiAgICBcIkBjb2RlbWlycm9yL2xhbmctamF2YXNjcmlwdFwiOiBcIl42LjEuMlwiLFxuICAgIFwiQGxleGljYWwvbGlzdFwiOiBcIl4wLjkuMFwiLFxuICAgIFwiQGxleGljYWwvcmVhY3RcIjogXCJeMC45LjBcIixcbiAgICBcIkBsZXhpY2FsL3NlbGVjdGlvblwiOiBcIl4wLjkuMFwiLFxuICAgIFwiQGxleGljYWwvdGV4dFwiOiBcIl4wLjkuMFwiLFxuICAgIFwiQGxleGljYWwvdXRpbHNcIjogXCJeMC45LjBcIixcbiAgICBcIkBsZXplci9oaWdobGlnaHRcIjogXCJeMS4xLjNcIixcbiAgICBcIkBwaWNtby9wb3B1cC1waWNrZXJcIjogXCJeNS44LjFcIixcbiAgICBcIkB0cnlnaG9zdC9rZy1jbGVhbi1iYXNpYy1odG1sXCI6IFwiXjMuMC43XCIsXG4gICAgXCJAdHJ5Z2hvc3Qva2ctZGVmYXVsdC1ub2Rlc1wiOiBcIl4wLjAuMTZcIixcbiAgICBcIkB0cnlnaG9zdC9rZy1tYXJrZG93bi1odG1sLXJlbmRlcmVyXCI6IFwiXjYuMC41XCIsXG4gICAgXCJAdHJ5Z2hvc3Qva2ctc2ltcGxlbWRlXCI6IFwiXjIuMC45XCIsXG4gICAgXCJAdWl3L3JlYWN0LWNvZGVtaXJyb3JcIjogXCJeNC4xOS42XCIsXG4gICAgXCJjb2RlbWlycm9yXCI6IFwiXjYuMC4xXCIsXG4gICAgXCJkb21wdXJpZnlcIjogXCJeMy4wLjBcIixcbiAgICBcImVtb2ppLXBpY2tlci1yZWFjdFwiOiBcIl40LjQuN1wiLFxuICAgIFwiZXZlbnRlbWl0dGVyM1wiOiBcIl41LjAuMFwiLFxuICAgIFwibGV4aWNhbFwiOiBcIl4wLjkuMFwiLFxuICAgIFwibG9kYXNoLWVzXCI6IFwiXjQuMTcuMjFcIixcbiAgICBcInBpY21vXCI6IFwiXjUuOC4xXCIsXG4gICAgXCJwbHVyYWxpemVcIjogXCJeOC4wLjBcIixcbiAgICBcInJlYWN0XCI6IFwiXjE4LjIuMFwiLFxuICAgIFwicmVhY3QtZG9tXCI6IFwiXjE4LjIuMFwiLFxuICAgIFwidml0ZVwiOiBcIl40LjEuNFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBiYWJlbC9jb3JlXCI6IFwiNy4yMS4zXCIsXG4gICAgXCJAZXRjaHRlYW0vc3Rvcnlib29rLWFkZG9uLXN0YXR1c1wiOiBcIl40LjIuMlwiLFxuICAgIFwiQHBsYXl3cmlnaHQvdGVzdFwiOiBcIl4xLjMwLjBcIixcbiAgICBcIkBzdG9yeWJvb2svYWRkb24tYWN0aW9uc1wiOiBcIjYuNS4xNlwiLFxuICAgIFwiQHN0b3J5Ym9vay9hZGRvbi1lc3NlbnRpYWxzXCI6IFwiNi41LjE2XCIsXG4gICAgXCJAc3Rvcnlib29rL2FkZG9uLWludGVyYWN0aW9uc1wiOiBcIjYuNS4xNlwiLFxuICAgIFwiQHN0b3J5Ym9vay9hZGRvbi1saW5rc1wiOiBcIjYuNS4xNlwiLFxuICAgIFwiQHN0b3J5Ym9vay9idWlsZGVyLXZpdGVcIjogXCIwLjQuMlwiLFxuICAgIFwiQHN0b3J5Ym9vay9yZWFjdFwiOiBcIjYuNS4xNlwiLFxuICAgIFwiQHN0b3J5Ym9vay90ZXN0aW5nLWxpYnJhcnlcIjogXCIwLjAuMTNcIixcbiAgICBcIkB0YWlsd2luZGNzcy9saW5lLWNsYW1wXCI6IFwiMC40LjJcIixcbiAgICBcIkB0ZXN0aW5nLWxpYnJhcnkvamVzdC1kb21cIjogXCI1LjE2LjVcIixcbiAgICBcIkB0ZXN0aW5nLWxpYnJhcnkvcmVhY3RcIjogXCIxNC4wLjBcIixcbiAgICBcIkB0eXBlcy9yZWFjdFwiOiBcIjE4LjAuMjhcIixcbiAgICBcIkB0eXBlcy9yZWFjdC1kb21cIjogXCIxOC4wLjExXCIsXG4gICAgXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiOiBcIjIuMi4wXCIsXG4gICAgXCJAdml0ZXN0L2NvdmVyYWdlLWM4XCI6IFwiMC4yOS4zXCIsXG4gICAgXCJAdml0ZXN0L3VpXCI6IFwiMC4yOS4zXCIsXG4gICAgXCJhdXRvcHJlZml4ZXJcIjogXCIxMC40LjE0XCIsXG4gICAgXCJiYWJlbC1sb2FkZXJcIjogXCI5LjEuMlwiLFxuICAgIFwiY3Jvc3MtZmV0Y2hcIjogXCJeMy4xLjVcIixcbiAgICBcImVzbGludC1jb25maWctcmVhY3QtYXBwXCI6IFwiNy4wLjFcIixcbiAgICBcImVzbGludC1wbHVnaW4tamVzdFwiOiBcIjI3LjIuMVwiLFxuICAgIFwiZXNsaW50LXBsdWdpbi1yZWFjdFwiOiBcIl43LjMyLjJcIixcbiAgICBcImVzbGludC1wbHVnaW4tdGFpbHdpbmRjc3NcIjogXCIzLjEwLjFcIixcbiAgICBcImpzZG9tXCI6IFwiMjEuMS4xXCIsXG4gICAgXCJwbGF5d3JpZ2h0XCI6IFwiMS4zMS4yXCIsXG4gICAgXCJwb3N0Y3NzXCI6IFwiOC40LjIxXCIsXG4gICAgXCJwb3N0Y3NzLWltcG9ydFwiOiBcIjE1LjEuMFwiLFxuICAgIFwicHJldHRpZXJcIjogXCIyLjguNFwiLFxuICAgIFwicmVhY3QtaGlnaGxpZ2h0XCI6IFwiXjAuMTUuMFwiLFxuICAgIFwicmVhY3Qtcm91dGVyLWRvbVwiOiBcIjYuOS4wXCIsXG4gICAgXCJ0YWlsd2luZGNzc1wiOiBcIjMuMi43XCIsXG4gICAgXCJ0eXBlc2NyaXB0XCI6IFwiNC45LjVcIixcbiAgICBcInZpdGVcIjogXCIzLjAuOFwiLFxuICAgIFwidml0ZS1wbHVnaW4tc3ZnclwiOiBcIjIuNC4wXCIsXG4gICAgXCJ2aXRlc3RcIjogXCIwLjI5LjNcIlxuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlZLFNBQVEsZUFBYztBQUN2WixTQUFRLG9CQUFtQjtBQUMzQixPQUFPLFdBQVc7QUFD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
