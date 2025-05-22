import {renderHook} from '@testing-library/react';
import React, {ReactNode} from 'react';
import {FrameworkProvider} from '../../../../src/providers/FrameworkProvider';
import {useFetchApi} from '../../../../src/utils/api/fetchApi';
import {http, HttpResponse} from '../../../../src/test/msw';
import {server} from './fetchApi.test.setup';

const wrapper: React.FC<{ children: ReactNode }> = ({children}) => (
    <FrameworkProvider
        externalNavigate={() => {}}
        ghostVersion='5.x'
        sentryDSN=''
        unsplashConfig={{
            Authorization: '',
            'Accept-Version': '',
            'Content-Type': '',
            'App-Pragma': '',
            'X-Unsplash-Cache': true
        }}
        onDelete={() => {}}
        onInvalidate={() => {}}
        onUpdate={() => {}}
    >
        {children}
    </FrameworkProvider>
);

describe('useFetchApi', function () {
    it('makes an API request', async function () {
        const {result} = renderHook(() => useFetchApi(), {wrapper});

        const data = await result.current<{test: number}>('http://localhost:3000/ghost/api/admin/test/', {
            method: 'POST',
            body: 'test',
            retry: false
        });

        // Verify the response data
        expect(data).toEqual({test: 1});
    });
    
    it('makes an API request with request capture', async function () {
        // Create a more sophisticated test with request capture
        let capturedBody = '';
        let capturedGhostVersion = '';
        let capturedContentType = '';
        
        // Override the handler with one that captures request details
        server.use(
            http.post('http://localhost:3000/ghost/api/admin/test/', async ({request}) => {
                capturedBody = await request.text();
                capturedGhostVersion = request.headers.get('x-ghost-version') || '';
                capturedContentType = request.headers.get('content-type') || '';
                
                return HttpResponse.json({test: 2, captured: true});
            })
        );
        
        const {result} = renderHook(() => useFetchApi(), {wrapper});

        const data = await result.current<{test: number, captured: boolean}>(
            'http://localhost:3000/ghost/api/admin/test/', 
            {
                method: 'POST',
                body: JSON.stringify({value: 'test-value'}),
                retry: false
            }
        );

        // Verify the response data
        expect(data).toEqual({test: 2, captured: true});
        
        // Verify the captured request details
        expect(capturedBody).toBe(JSON.stringify({value: 'test-value'}));
        expect(capturedGhostVersion).toBe('5.x');
        expect(capturedContentType).toBe('application/json');
    });
});
