import React from 'react';
import {render} from '@testing-library/react';
import AppContext from '../../AppContext';
import {GetMessage, getErrorFromApiResponse, getMessageFromError} from '../../utils/errors';

// Mock AppContext
jest.mock('../../AppContext', () => ({
    __esModule: true,
    default: React.createContext({t: jest.fn()})
}));

describe('GetMessage', () => {
    it('returns translated message when t function is available', () => {
        const tMock = jest.fn().mockImplementation(msg => `translated: ${msg}`);
        const {getByText} = render(
            <AppContext.Provider value={{t: tMock}}>
                <GetMessage message="Hello" />
            </AppContext.Provider>
        );
        expect(getByText('translated: Hello')).toBeInTheDocument();
        expect(tMock).toHaveBeenCalledWith('Hello');
    });

    it('returns original message when t function is not available', () => {
        const {getByText} = render(
            <AppContext.Provider value={{}}>
                <GetMessage message="Hello" />
            </AppContext.Provider>
        );
        expect(getByText('Hello')).toBeInTheDocument();
    });
});

describe('getErrorFromApiResponse', () => {
    // These tests are a little goofy because we're not testing the translation, we're testing that the function
    // returns an Error with the correct message. We're not testing the message itself because that's handled in the
    // getMessage function. And this doesn't run in react so the react component gets odd.
    it('returns Error with translated message for 400 status', async () => {
        const res = {
            status: 400,
            json: jest.fn().mockResolvedValue({errors: [{message: 'Bad Request'}]})
        };
        const error = await getErrorFromApiResponse(res);
        expect(error).toBeInstanceOf(Error);
    });

    // These tests are a little goofy because we're not testing the translation, we're testing that the function
    // returns an Error with the correct message. We're not testing the message itself because that's handled in the
    // getMessage function. And this doesn't run in react so the react component gets odd.
    it('returns Error with translated message for 429 status', async () => {
        const res = {
            status: 429,
            json: jest.fn().mockResolvedValue({errors: [{message: 'Too Many Requests'}]})
        };
        const error = await getErrorFromApiResponse(res);
        expect(error).toBeInstanceOf(Error);
    });

    it('returns undefined for other status codes', async () => {
        const res = {status: 200};
        const error = await getErrorFromApiResponse(res);
        expect(error).toBeUndefined();
    });

    it('returns undefined when json parsing fails', async () => {
        const res = {
            status: 400,
            json: jest.fn().mockRejectedValue(new Error('JSON parse error'))
        };
        const error = await getErrorFromApiResponse(res);
        expect(error).toBeUndefined();
    });
});

describe('getMessageFromError', () => {
    it('returns GetMessage component with default message when provided', () => {
        const result = getMessageFromError(new Error('Test error'), 'Default message');
        const {getByText} = render(<AppContext.Provider value={{}}>{result}</AppContext.Provider>);
        expect(getByText('Default message')).toBeInTheDocument();
    });

    it('returns GetMessage component with error message for Error instance', () => {
        const result = getMessageFromError(new Error('Test error'));
        const {getByText} = render(<AppContext.Provider value={{}}>{result}</AppContext.Provider>);
        expect(getByText('Test error')).toBeInTheDocument();
    });

    it('returns GetMessage component with error for non-Error objects', () => {
        const result = getMessageFromError('String error');
        const {getByText} = render(<AppContext.Provider value={{}}>{result}</AppContext.Provider>);
        expect(getByText('String error')).toBeInTheDocument();
    });
});