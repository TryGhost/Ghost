/*
 * MSW's worker plus static routes that send the app's own scripts and styles
 * straight to the network. MSW never fakes them, and a response the worker
 * hands back cannot reuse the HTTP cache or V8's compiled code, so each spec
 * file's fresh iframe would fetch and compile every app module again.
 */
importScripts('./mockServiceWorker.js');

addEventListener('install', (event) => {
  const sameOrigin = new URLPattern({ origin: self.location.origin });
  event.addRoutes(
    ['script', 'style'].map((requestDestination) => ({
      condition: { requestDestination, urlPattern: sameOrigin },
      source: 'network',
    })),
  );
});
