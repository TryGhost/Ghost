import {render} from '@testing-library/react';
import App from './App';
import React from 'react';
import nock from 'nock';

test('renders Sodo Search app component', () => {
    nock('http://localhost:3000/ghost/api/content')
        .get('/posts/?key=69010382388f9de5869ad6e558&limit=10000&fields=id%2Cslug%2Ctitle%2Cexcerpt%2Curl%2Cupdated_at%2Cvisibility&order=updated_at%20DESC')
        .reply(200, {
            posts: []
        })
        .get('/authors/?key=69010382388f9de5869ad6e558&limit=10000&fields=id,slug,name,url,profile_image&order=updated_at%20DESC')
        .reply(200, {
            authors: []
        })
        .get('/tags/?key=69010382388f9de5869ad6e558&&limit=10000&fields=id,slug,name,url&order=updated_at%20DESC&filter=visibility%3Apublic')
        .reply(200, {
            tags: []
        });

    window.location.hash = '#/search';
    render(<App adminUrl="http://localhost:3000" apiKey="69010382388f9de5869ad6e558" />);
    // const containerElement = screen.getElementsByClassName('gh-portal-popup-container');
    const containerElement = document.querySelector('.gh-root-frame');
    expect(containerElement).toBeInTheDocument();
});
