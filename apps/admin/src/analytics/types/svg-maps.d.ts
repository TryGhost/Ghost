declare module '@svg-maps/world' {
    const world: { viewBox: string; locations: Array<{ id: string; name: string; path: string }> };
    export default world;
}
