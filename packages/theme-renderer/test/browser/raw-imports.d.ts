// Vite `?raw` imports (fixture files loaded as strings by the browser suite).
declare module '*?raw' {
    const content: string;
    export default content;
}
