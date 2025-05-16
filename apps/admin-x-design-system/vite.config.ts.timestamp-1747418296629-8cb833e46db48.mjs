// vite.config.ts
import react from "file:///Users/chris/Developer/TryGhost/Ghost/node_modules/.pnpm/@vitejs+plugin-react@4.4.1_vite@4.5.14_@types+node@22.15.18_less@4.3.0_terser@5.39.2_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import glob from "file:///Users/chris/Developer/TryGhost/Ghost/node_modules/.pnpm/glob@11.0.0/node_modules/glob/dist/esm/index.js";
import { resolve } from "path";
import svgr from "file:///Users/chris/Developer/TryGhost/Ghost/node_modules/.pnpm/vite-plugin-svgr@3.3.0_rollup@3.28.0_vite@4.5.14_@types+node@22.15.18_less@4.3.0_terser@5.39.2_/node_modules/vite-plugin-svgr/dist/index.js";
import { defineConfig } from "file:///Users/chris/Developer/TryGhost/Ghost/node_modules/.pnpm/vitest@3.1.3_@types+node@22.15.18_jiti@1.21.7_jsdom@24.1.3_less@4.3.0_msw@2.8.2_@types+_7fb8f90ddffd0cfbd879a419d5f75d0b/node_modules/vitest/dist/config.js";
var __vite_injected_original_dirname = "/Users/chris/Developer/TryGhost/Ghost/apps/admin-x-design-system";
var vite_config_default = function viteConfig() {
  return defineConfig({
    logLevel: process.env.CI ? "info" : "warn",
    plugins: [
      svgr(),
      react()
    ],
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
        entry: glob.sync(resolve(__vite_injected_original_dirname, "src/**/*.{ts,tsx}")).reduce((entries, path) => {
          if (path.includes(".stories.") || path.endsWith(".d.ts")) {
            return entries;
          }
          const outPath = path.replace(resolve(__vite_injected_original_dirname, "src") + "/", "").replace(/\.(ts|tsx)$/, "");
          entries[outPath] = path;
          return entries;
        }, {})
      },
      commonjsOptions: {
        include: [/packages/, /node_modules/]
      },
      rollupOptions: {
        external: (source) => {
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvY2hyaXMvRGV2ZWxvcGVyL1RyeUdob3N0L0dob3N0L2FwcHMvYWRtaW4teC1kZXNpZ24tc3lzdGVtXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvY2hyaXMvRGV2ZWxvcGVyL1RyeUdob3N0L0dob3N0L2FwcHMvYWRtaW4teC1kZXNpZ24tc3lzdGVtL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9jaHJpcy9EZXZlbG9wZXIvVHJ5R2hvc3QvR2hvc3QvYXBwcy9hZG1pbi14LWRlc2lnbi1zeXN0ZW0vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHN2Z3IgZnJvbSAndml0ZS1wbHVnaW4tc3Zncic7XG5pbXBvcnQge2RlZmluZUNvbmZpZ30gZnJvbSAndml0ZXN0L2NvbmZpZyc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCAoZnVuY3Rpb24gdml0ZUNvbmZpZygpIHtcbiAgICByZXR1cm4gZGVmaW5lQ29uZmlnKHtcbiAgICAgICAgbG9nTGV2ZWw6IHByb2Nlc3MuZW52LkNJID8gJ2luZm8nIDogJ3dhcm4nLFxuICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgICBzdmdyKCksXG4gICAgICAgICAgICByZWFjdCgpXG4gICAgICAgIF0sXG4gICAgICAgIGRlZmluZToge1xuICAgICAgICAgICAgJ3Byb2Nlc3MuZW52Lk5PREVfRU5WJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuTk9ERV9FTlYpLFxuICAgICAgICAgICAgJ3Byb2Nlc3MuZW52LlZJVEVTVF9TRUdGQVVMVF9SRVRSWSc6IDNcbiAgICAgICAgfSxcbiAgICAgICAgcHJldmlldzoge1xuICAgICAgICAgICAgcG9ydDogNDE3NFxuICAgICAgICB9LFxuICAgICAgICBidWlsZDoge1xuICAgICAgICAgICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IGZhbHNlLFxuICAgICAgICAgICAgbWluaWZ5OiBmYWxzZSxcbiAgICAgICAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICAgICAgICAgIG91dERpcjogJ2VzJyxcbiAgICAgICAgICAgIGxpYjoge1xuICAgICAgICAgICAgICAgIGZvcm1hdHM6IFsnZXMnXSxcbiAgICAgICAgICAgICAgICBlbnRyeTogZ2xvYi5zeW5jKHJlc29sdmUoX19kaXJuYW1lLCAnc3JjLyoqLyoue3RzLHRzeH0nKSkucmVkdWNlKChlbnRyaWVzLCBwYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXRoLmluY2x1ZGVzKCcuc3Rvcmllcy4nKSB8fCBwYXRoLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZW50cmllcztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dFBhdGggPSBwYXRoLnJlcGxhY2UocmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSArICcvJywgJycpLnJlcGxhY2UoL1xcLih0c3x0c3gpJC8sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgZW50cmllc1tvdXRQYXRoXSA9IHBhdGg7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbnRyaWVzO1xuICAgICAgICAgICAgICAgIH0sIHt9IGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgaW5jbHVkZTogWy9wYWNrYWdlcy8sIC9ub2RlX21vZHVsZXMvXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBleHRlcm5hbDogKHNvdXJjZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFzb3VyY2UuaW5jbHVkZXMoX19kaXJuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRlc3Q6IHtcbiAgICAgICAgICAgIGdsb2JhbHM6IHRydWUsIC8vIHJlcXVpcmVkIGZvciBAdGVzdGluZy1saWJyYXJ5L2plc3QtZG9tIGV4dGVuc2lvbnNcbiAgICAgICAgICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgICAgICAgICAgaW5jbHVkZTogWycuL3Rlc3QvdW5pdC8qKi8qJ10sXG4gICAgICAgICAgICB0ZXN0VGltZW91dDogcHJvY2Vzcy5lbnYuVElNRU9VVCA/IHBhcnNlSW50KHByb2Nlc3MuZW52LlRJTUVPVVQpIDogMTAwMDAsXG4gICAgICAgICAgICAuLi4ocHJvY2Vzcy5lbnYuQ0kgJiYgeyAvLyBodHRwczovL2dpdGh1Yi5jb20vdml0ZXN0LWRldi92aXRlc3QvaXNzdWVzLzE2NzRcbiAgICAgICAgICAgICAgICBtaW5UaHJlYWRzOiAxLFxuICAgICAgICAgICAgICAgIG1heFRocmVhZHM6IDJcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrWCxPQUFPLFdBQVc7QUFDcFksT0FBTyxVQUFVO0FBQ2pCLFNBQVEsZUFBYztBQUN0QixPQUFPLFVBQVU7QUFDakIsU0FBUSxvQkFBbUI7QUFKM0IsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTyxzQkFBUyxTQUFTLGFBQWE7QUFDbEMsU0FBTyxhQUFhO0FBQUEsSUFDaEIsVUFBVSxRQUFRLElBQUksS0FBSyxTQUFTO0FBQUEsSUFDcEMsU0FBUztBQUFBLE1BQ0wsS0FBSztBQUFBLE1BQ0wsTUFBTTtBQUFBLElBQ1Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNKLHdCQUF3QixLQUFLLFVBQVUsUUFBUSxJQUFJLFFBQVE7QUFBQSxNQUMzRCxxQ0FBcUM7QUFBQSxJQUN6QztBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ0wsTUFBTTtBQUFBLElBQ1Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNILHNCQUFzQjtBQUFBLE1BQ3RCLFFBQVE7QUFBQSxNQUNSLFdBQVc7QUFBQSxNQUNYLFFBQVE7QUFBQSxNQUNSLEtBQUs7QUFBQSxRQUNELFNBQVMsQ0FBQyxJQUFJO0FBQUEsUUFDZCxPQUFPLEtBQUssS0FBSyxRQUFRLGtDQUFXLG1CQUFtQixDQUFDLEVBQUUsT0FBTyxDQUFDLFNBQVMsU0FBUztBQUNoRixjQUFJLEtBQUssU0FBUyxXQUFXLEtBQUssS0FBSyxTQUFTLE9BQU8sR0FBRztBQUN0RCxtQkFBTztBQUFBLFVBQ1g7QUFFQSxnQkFBTSxVQUFVLEtBQUssUUFBUSxRQUFRLGtDQUFXLEtBQUssSUFBSSxLQUFLLEVBQUUsRUFBRSxRQUFRLGVBQWUsRUFBRTtBQUMzRixrQkFBUSxPQUFPLElBQUk7QUFDbkIsaUJBQU87QUFBQSxRQUNYLEdBQUcsQ0FBQyxDQUEyQjtBQUFBLE1BQ25DO0FBQUEsTUFDQSxpQkFBaUI7QUFBQSxRQUNiLFNBQVMsQ0FBQyxZQUFZLGNBQWM7QUFBQSxNQUN4QztBQUFBLE1BQ0EsZUFBZTtBQUFBLFFBQ1gsVUFBVSxDQUFDLFdBQVc7QUFDbEIsY0FBSSxPQUFPLFdBQVcsR0FBRyxHQUFHO0FBQ3hCLG1CQUFPO0FBQUEsVUFDWDtBQUVBLGNBQUksT0FBTyxTQUFTLGNBQWMsR0FBRztBQUNqQyxtQkFBTztBQUFBLFVBQ1g7QUFFQSxpQkFBTyxDQUFDLE9BQU8sU0FBUyxnQ0FBUztBQUFBLFFBQ3JDO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFBQSxJQUNBLE1BQU07QUFBQSxNQUNGLFNBQVM7QUFBQTtBQUFBLE1BQ1QsYUFBYTtBQUFBLE1BQ2IsU0FBUyxDQUFDLGtCQUFrQjtBQUFBLE1BQzVCLGFBQWEsUUFBUSxJQUFJLFVBQVUsU0FBUyxRQUFRLElBQUksT0FBTyxJQUFJO0FBQUEsTUFDbkUsR0FBSSxRQUFRLElBQUksTUFBTTtBQUFBO0FBQUEsUUFDbEIsWUFBWTtBQUFBLFFBQ1osWUFBWTtBQUFBLE1BQ2hCO0FBQUEsSUFDSjtBQUFBLEVBQ0osQ0FBQztBQUNMOyIsCiAgIm5hbWVzIjogW10KfQo=
