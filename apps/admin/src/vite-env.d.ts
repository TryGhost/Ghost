/// <reference types="vite/client" />

declare global {
  interface Window {
    __ghost_admin_bridge__: Record<string, unknown>;
  }
}

export {};