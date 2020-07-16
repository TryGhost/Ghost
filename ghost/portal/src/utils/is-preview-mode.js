function isPreviewMode() {
    const [path, qs] = window.location.hash.substr(1).split('?');
    return ((process.env.NODE_ENV === 'development') || (path === '/portal' && qs));
}

export default isPreviewMode;