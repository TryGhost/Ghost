export default function mockSnippets(server) {
    server.get('/snippets/');
    server.post('/snippets/');
    server.put('/snippets/:id/');
    server.del('/snippets/:id/');
}
