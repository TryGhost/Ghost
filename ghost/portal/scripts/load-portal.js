/** Script to load live Portal script chunks for local development */
function loadScript(src) {
    var script = document.createElement('script');
    script.src = src;
    document.head.appendChild(script);
}

loadScript('http://localhost:3000/static/js/bundle.js');
loadScript('http://localhost:3000/static/js/1.chunk.js');
loadScript('http://localhost:3000/static/js/0.chunk.js');
loadScript('http://localhost:3000/static/js/main.chunk.js');
