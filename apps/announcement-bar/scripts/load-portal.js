/** Script to load Portal bundle for local development */
function loadScript(src) {
    var script = document.createElement('script');
    script.src = src;
    document.head.appendChild(script);
}

loadScript('http://localhost:3000/static/js/bundle.js');
