import {HumanReadableError, chooseBestErrorMessage} from '../utils/errors';
import {vi} from 'vitest';

vi.mock('@tryghost/i18n', () => {
    const mockT = vi.fn((message, params) => {
        if (params?.number) {
            return `translated ${message.replace('{number}', params.number)}`;
        }
        return `translated ${message}`;
    });

    return {
        default: vi.fn(() => ({
            t: mockT
        }))
    };
});

describe('error messages are set correctly', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('handles 400 error without defaultMessage', async () => {
        const error = new Response('{"errors":[{"message":"This is a 400 error"}]}', {status: 400});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        expect(chooseBestErrorMessage(humanReadableError, null)).toEqual('translated This is a 400 error');
    });

    test('handles an error with defaultMessage not a special message', async () => {
        const error = new Response('{"errors":[{"message":"This is a 400 error"}]}', {status: 400});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        // note that the default message is passed in already-translated.
        expect(chooseBestErrorMessage(humanReadableError, 'translated default message')).toEqual('translated default message');
    });

    test('handles an error with defaultMessage that is a special message', async () => {
        const error = new Response('{"errors":[{"message":"Too many attempts try again in {number} minutes."}]}', {status: 400});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        expect(chooseBestErrorMessage(humanReadableError, 'this is the default message')).toEqual('translated Too many attempts try again in {number} minutes.');
    });

    test('handles an error when the message has a number', async () => {
        const error = new Response('{"errors":[{"message":"Too many attempts try again in 10 minutes."}]}', {status: 400});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        expect(chooseBestErrorMessage(humanReadableError, 'this is the default message')).toEqual('translated Too many attempts try again in 10 minutes.');
    });

    test('handles a 500 error', async () => {
        const error = new Response('{"errors":[{"message":"This is a 500 error"}]}', {status: 500});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        expect(chooseBestErrorMessage(humanReadableError, null)).toEqual('translated A server error occurred');
    });

    test('gets the magic link error message correctly', async () => {
        const error = new Response('{"errors":[{"message":"Failed to send magic link email"}]}', {status: 400});
        const humanReadableError = await HumanReadableError.fromApiResponse(error);
        expect(chooseBestErrorMessage(humanReadableError, null)).toEqual('translated Failed to send magic link email');
    });
});
