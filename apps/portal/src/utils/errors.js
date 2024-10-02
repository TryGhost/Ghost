export class HumanReadableError extends Error {
    /**
     * Returns whether this response from the server is a human readable error and should be shown to the user.
     * @param {Response} res
     * @returns {HumanReadableError|undefined}
     */
    static async fromApiResponse ( res ) {
        // Bad request + Too many requests
        if ( res.status === 400 || res.status === 429 ) {
            try {
                const json = await res.json();
                if ( json.errors && Array.isArray( json.errors ) && json.errors.length > 0 && json.errors[ 0 ].message ) {
                    return new HumanReadableError( json.errors[ 0 ].message );
                }
            } catch ( e ) {
                // Failed to decode: ignore
                return false;
            }
        }
    }
}

// changing this - will export this helper.  It's not helping me to have it stuck to HumanReadableError... 

/**
 * Only output the message of an error if it is a human readable error and should be exposed to the user.
 * Otherwise it returns a default generic message.
 * alreadyTranslatedDefaultMessage is already translated, because otherwise the 
 * generation of translation strings breaks. 
 */
export function chooseBestErrorMessage ( error, alreadyTranslatedDefaultMessage, t ) {
    // helper functions
    const translateMessage = ( message, number = null ) => {
        console.log('translateMessage thinks t is', t);
        if ( number ) {
            return t( message, { number } );
        } else {
            return t( message );
        }
    };

    const isSpecialMessage = ( message ) => {
        // IMPORTANT: If you add to this list, also add to myfakeFunction below so that the parser will pick it up.
        // Yes, there's got to be a better way to do this.

        let specialMessages = [
            'No member exists with this e-mail address. Please sign up first.',
            'No member exists with this e-mail address.',
            'This site is invite-only, contact the owner for access.',
            'Unable to initiate checkout session',
            'This site is not accepting payments at the moment.',
            'Too many attempts try again in {{number}} minutes.',
            'Too many attempts try again in {{number}} hours.',
            'Too many attempts try again in {{number}} days.',
            'Too many different sign-in attempts, try again in {{number}} minutes',
            'Too many different sign-in attempts, try again in {{number}} hours',
            'Too many different sign-in attempts, try again in {{number}} days'
        ];

        if ( specialMessages.includes( message ) ) {
            console.log( 'this is a special message', message );
            return true;
        }
        return false;
    };

    const prepareErrorMessage = ( message = null ) => {
        // Check for a number in message, if found, replace the number with {{number}} and return the number.
        // Assumes there's only one number in the message. 
        console.log( 'received message', message );
        const number = message.match( /\d+/ );
        if ( number ) {
            message = message.replace( number[ 0 ], '{{number}}' );
        }
        console.log( 'message', message, 'number', number ? number[ 0 ] : null );
        return { preparedMessage: message, number: number ? number[ 0 ] : null };
    };

    // main function
    if (!error && !alreadyTranslatedDefaultMessage) { return t( 'An error occurred' ); }
    if ( error instanceof HumanReadableError || error.message ) {
        console.log( 'error.message is', error.message );
        const { preparedMessage, number } = prepareErrorMessage( error.message );
        if ( isSpecialMessage( preparedMessage ) ) {
            console.log( 'return special message', preparedMessage );
            return translateMessage(preparedMessage, number );
        } else {
            console.log( 'not special, might use default', alreadyTranslatedDefaultMessage, 'instead of', preparedMessage );
            return alreadyTranslatedDefaultMessage || translateMessage( error.message );
        }
    } else {
        // use the default message if there's no error message
        // if we don't have a default message either, fall back to a generic message plus the actual error.
        return alreadyTranslatedDefaultMessage || t( 'An error occurred:' ) + ' ' + error.toString();
    }
}

/* This fails linting, because it's only here so that these strings can get picked up for translation */
// eslint-disable-next-line no-unused-vars
const myfakeFunction = () => {
    const t = ( message ) => {
        return message;
    };
    t( 'No member exists with this e-mail address. Please sign up first.' );
    t( 'No member exists with this e-mail address.' );
    t( 'This site is invite-only, contact the owner for access.' );
    t( 'Unable to initiate checkout session' );
    t( 'This site is not accepting payments at the moment.' );
    t( 'Too many attempts try again in {{number}} minutes.' );
    t( 'Too many attempts try again in {{number}} hours.' );
    t( 'Too many attempts try again in {{number}} days.' );
    t( 'Too many different sign-in attempts, try again in {{number}} minutes' );
    t( 'Too many different sign-in attempts, try again in {{number}} hours' );
    t( 'Too many different sign-in attempts, try again in {{number}} days' );
};

