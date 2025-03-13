// vite.config.ts
import path from "path";
import react from "file:///Users/princivershwal/Work/Ghost/node_modules/@vitejs/plugin-react/dist/index.mjs";
import glob from "file:///Users/princivershwal/Work/Ghost/node_modules/glob/glob.js";
import { resolve } from "path";
import svgr from "file:///Users/princivershwal/Work/Ghost/node_modules/vite-plugin-svgr/dist/index.js";
import { defineConfig } from "file:///Users/princivershwal/Work/Ghost/node_modules/vitest/dist/config.js";
var __vite_injected_original_dirname = "/Users/princivershwal/Work/Ghost/apps/shade";
var vite_config_default = function viteConfig() {
  return defineConfig({
    logLevel: process.env.CI ? "info" : "warn",
    plugins: [
      svgr(),
      react()
    ],
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
      "process.env.VITEST_SEGFAULT_RETRY": 3
    },
    preview: {
      port: 4174
    },
    build: {
      reportCompressedSize: false,
      minify: false,
      sourcemap: true,
      outDir: "es",
      lib: {
        formats: ["es"],
        entry: glob.sync(resolve(__vite_injected_original_dirname, "src/**/*.{ts,tsx}")).reduce((entries, libpath) => {
          if (libpath.includes(".stories.") || libpath.endsWith(".d.ts")) {
            return entries;
          }
          const outPath = libpath.replace(resolve(__vite_injected_original_dirname, "src") + "/", "").replace(/\.(ts|tsx)$/, "");
          entries[outPath] = libpath;
          return entries;
        }, {})
      },
      commonjsOptions: {
        include: [/packages/, /node_modules/]
      },
      rollupOptions: {
        external: (source) => {
          if (source.startsWith("@/")) {
            return false;
          }
          if (source.startsWith(".")) {
            return false;
          }
          if (source.includes("node_modules")) {
            return true;
          }
          return !source.includes(__vite_injected_original_dirname);
        }
      }
    },
    test: {
      globals: true,
      // required for @testing-library/jest-dom extensions
      environment: "jsdom",
      include: ["./test/unit/**/*"],
      testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 1e4,
      ...process.env.CI && {
        // https://github.com/vitest-dev/vitest/issues/1674
        minThreads: 1,
        maxThreads: 2
      }
    }
  });
};
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvcHJpbmNpdmVyc2h3YWwvV29yay9HaG9zdC9hcHBzL3NoYWRlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvcHJpbmNpdmVyc2h3YWwvV29yay9HaG9zdC9hcHBzL3NoYWRlL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9wcmluY2l2ZXJzaHdhbC9Xb3JrL0dob3N0L2FwcHMvc2hhZGUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7cmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgc3ZnciBmcm9tICd2aXRlLXBsdWdpbi1zdmdyJztcbmltcG9ydCB7ZGVmaW5lQ29uZmlnfSBmcm9tICd2aXRlc3QvY29uZmlnJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IChmdW5jdGlvbiB2aXRlQ29uZmlnKCkge1xuICAgIHJldHVybiBkZWZpbmVDb25maWcoe1xuICAgICAgICBsb2dMZXZlbDogcHJvY2Vzcy5lbnYuQ0kgPyAnaW5mbycgOiAnd2FybicsXG4gICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgIHN2Z3IoKSxcbiAgICAgICAgICAgIHJlYWN0KClcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlZmluZToge1xuICAgICAgICAgICAgJ3Byb2Nlc3MuZW52Lk5PREVfRU5WJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuTk9ERV9FTlYpLFxuICAgICAgICAgICAgJ3Byb2Nlc3MuZW52LlZJVEVTVF9TRUdGQVVMVF9SRVRSWSc6IDNcbiAgICAgICAgfSxcbiAgICAgICAgcHJldmlldzoge1xuICAgICAgICAgICAgcG9ydDogNDE3NFxuICAgICAgICB9LFxuICAgICAgICBidWlsZDoge1xuICAgICAgICAgICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IGZhbHNlLFxuICAgICAgICAgICAgbWluaWZ5OiBmYWxzZSxcbiAgICAgICAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICAgICAgICAgIG91dERpcjogJ2VzJyxcbiAgICAgICAgICAgIGxpYjoge1xuICAgICAgICAgICAgICAgIGZvcm1hdHM6IFsnZXMnXSxcbiAgICAgICAgICAgICAgICBlbnRyeTogZ2xvYi5zeW5jKHJlc29sdmUoX19kaXJuYW1lLCAnc3JjLyoqLyoue3RzLHRzeH0nKSkucmVkdWNlKChlbnRyaWVzLCBsaWJwYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsaWJwYXRoLmluY2x1ZGVzKCcuc3Rvcmllcy4nKSB8fCBsaWJwYXRoLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZW50cmllcztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dFBhdGggPSBsaWJwYXRoLnJlcGxhY2UocmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSArICcvJywgJycpLnJlcGxhY2UoL1xcLih0c3x0c3gpJC8sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgZW50cmllc1tvdXRQYXRoXSA9IGxpYnBhdGg7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbnRyaWVzO1xuICAgICAgICAgICAgICAgIH0sIHt9IGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgaW5jbHVkZTogWy9wYWNrYWdlcy8sIC9ub2RlX21vZHVsZXMvXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBleHRlcm5hbDogKHNvdXJjZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlLnN0YXJ0c1dpdGgoJ0AvJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2Uuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIXNvdXJjZS5pbmNsdWRlcyhfX2Rpcm5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGVzdDoge1xuICAgICAgICAgICAgZ2xvYmFsczogdHJ1ZSwgLy8gcmVxdWlyZWQgZm9yIEB0ZXN0aW5nLWxpYnJhcnkvamVzdC1kb20gZXh0ZW5zaW9uc1xuICAgICAgICAgICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgICAgICAgICBpbmNsdWRlOiBbJy4vdGVzdC91bml0LyoqLyonXSxcbiAgICAgICAgICAgIHRlc3RUaW1lb3V0OiBwcm9jZXNzLmVudi5USU1FT1VUID8gcGFyc2VJbnQocHJvY2Vzcy5lbnYuVElNRU9VVCkgOiAxMDAwMCxcbiAgICAgICAgICAgIC4uLihwcm9jZXNzLmVudi5DSSAmJiB7IC8vIGh0dHBzOi8vZ2l0aHViLmNvbS92aXRlc3QtZGV2L3ZpdGVzdC9pc3N1ZXMvMTY3NFxuICAgICAgICAgICAgICAgIG1pblRocmVhZHM6IDEsXG4gICAgICAgICAgICAgICAgbWF4VGhyZWFkczogMlxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1ULE9BQU8sVUFBVTtBQUNwVSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVEsZUFBYztBQUN0QixPQUFPLFVBQVU7QUFDakIsU0FBUSxvQkFBbUI7QUFMM0IsSUFBTSxtQ0FBbUM7QUFRekMsSUFBTyxzQkFBUyxTQUFTLGFBQWE7QUFDbEMsU0FBTyxhQUFhO0FBQUEsSUFDaEIsVUFBVSxRQUFRLElBQUksS0FBSyxTQUFTO0FBQUEsSUFDcEMsU0FBUztBQUFBLE1BQ0wsS0FBSztBQUFBLE1BQ0wsTUFBTTtBQUFBLElBQ1Y7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNMLE9BQU87QUFBQSxRQUNILEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxNQUN4QztBQUFBLElBQ0o7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNKLHdCQUF3QixLQUFLLFVBQVUsUUFBUSxJQUFJLFFBQVE7QUFBQSxNQUMzRCxxQ0FBcUM7QUFBQSxJQUN6QztBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ0wsTUFBTTtBQUFBLElBQ1Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNILHNCQUFzQjtBQUFBLE1BQ3RCLFFBQVE7QUFBQSxNQUNSLFdBQVc7QUFBQSxNQUNYLFFBQVE7QUFBQSxNQUNSLEtBQUs7QUFBQSxRQUNELFNBQVMsQ0FBQyxJQUFJO0FBQUEsUUFDZCxPQUFPLEtBQUssS0FBSyxRQUFRLGtDQUFXLG1CQUFtQixDQUFDLEVBQUUsT0FBTyxDQUFDLFNBQVMsWUFBWTtBQUNuRixjQUFJLFFBQVEsU0FBUyxXQUFXLEtBQUssUUFBUSxTQUFTLE9BQU8sR0FBRztBQUM1RCxtQkFBTztBQUFBLFVBQ1g7QUFFQSxnQkFBTSxVQUFVLFFBQVEsUUFBUSxRQUFRLGtDQUFXLEtBQUssSUFBSSxLQUFLLEVBQUUsRUFBRSxRQUFRLGVBQWUsRUFBRTtBQUM5RixrQkFBUSxPQUFPLElBQUk7QUFDbkIsaUJBQU87QUFBQSxRQUNYLEdBQUcsQ0FBQyxDQUEyQjtBQUFBLE1BQ25DO0FBQUEsTUFDQSxpQkFBaUI7QUFBQSxRQUNiLFNBQVMsQ0FBQyxZQUFZLGNBQWM7QUFBQSxNQUN4QztBQUFBLE1BQ0EsZUFBZTtBQUFBLFFBQ1gsVUFBVSxDQUFDLFdBQVc7QUFDbEIsY0FBSSxPQUFPLFdBQVcsSUFBSSxHQUFHO0FBQ3pCLG1CQUFPO0FBQUEsVUFDWDtBQUVBLGNBQUksT0FBTyxXQUFXLEdBQUcsR0FBRztBQUN4QixtQkFBTztBQUFBLFVBQ1g7QUFFQSxjQUFJLE9BQU8sU0FBUyxjQUFjLEdBQUc7QUFDakMsbUJBQU87QUFBQSxVQUNYO0FBRUEsaUJBQU8sQ0FBQyxPQUFPLFNBQVMsZ0NBQVM7QUFBQSxRQUNyQztBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsSUFDQSxNQUFNO0FBQUEsTUFDRixTQUFTO0FBQUE7QUFBQSxNQUNULGFBQWE7QUFBQSxNQUNiLFNBQVMsQ0FBQyxrQkFBa0I7QUFBQSxNQUM1QixhQUFhLFFBQVEsSUFBSSxVQUFVLFNBQVMsUUFBUSxJQUFJLE9BQU8sSUFBSTtBQUFBLE1BQ25FLEdBQUksUUFBUSxJQUFJLE1BQU07QUFBQTtBQUFBLFFBQ2xCLFlBQVk7QUFBQSxRQUNaLFlBQVk7QUFBQSxNQUNoQjtBQUFBLElBQ0o7QUFBQSxFQUNKLENBQUM7QUFDTDsiLAogICJuYW1lcyI6IFtdCn0K
