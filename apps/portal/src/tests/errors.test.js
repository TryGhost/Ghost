import {HumanReadableError, chooseBestErrorMessage} from '../utils/errors';

describe('error messages are set correctly', () => {
    test('handles 400 error without defaultMessage', async () => {
        function t(message) { 
            return 'translated ' + message;
        }
        const error = new Response('{"errors":[{"message":"This is a 400 error"}]}', {status: 400});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        expect(chooseBestErrorMessage(humanReadableError, null, t)).toEqual('translated This is a 400 error');
    });

    test('handles an error with defaultMessage not a special message', async () => {
        function t(message) { 
            return 'translated ' + message;
        }
        const error = new Response('{"errors":[{"message":"This is a 400 error"}]}', {status: 400});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        // note that the default message is passed in already-translated.
        expect(chooseBestErrorMessage(humanReadableError, 'translated default message', t)).toEqual('translated default message');
    });

    test('handles an error with defaultMessage that is a special message', async () => {
        function t(message) { 
            return 'translated ' + message;
        }
        const error = new Response('{"errors":[{"message":"Too many attempts try again in {{number}} minutes."}]}', {status: 400});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        expect(chooseBestErrorMessage(humanReadableError, 'this is the default message', t)).toEqual('translated Too many attempts try again in {{number}} minutes.');
    });

    test('handles an error when the message has a number', async () => {
        function t(message, {number: number}) { 
            return 'translated ' + message + ' ' + number;
        }
        const error = new Response('{"errors":[{"message":"Too many attempts try again in 10 minutes."}]}', {status: 400});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        expect(chooseBestErrorMessage(humanReadableError, 'this is the default message', t)).toEqual('translated Too many attempts try again in {{number}} minutes. 10');
    });

    test('handles a 500 error', async () => {
        function t(message) { 
            return 'translated ' + message;
        }
        const error = new Response('{"errors":[{"message":"This is a 500 error"}]}', {status: 500});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        expect(chooseBestErrorMessage(humanReadableError, null, t)).toEqual('translated A server error occurred');
    });

    test('gets the magic link error message correctly', async () => {
        function t(message) { 
            return 'translated ' + message;
        }
        const error = new Response('{"errors":[{"message":"Failed to send magic link email"}]}', {status: 400});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        expect(chooseBestErrorMessage(humanReadableError, null, t)).toEqual('translated Failed to send magic link email');
    });
});