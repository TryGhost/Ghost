import React from 'react';

function HCaptchaMockBase({onLoad, onVerify, ...props}, ref) {
    // Provide mock execute method
    React.useImperativeHandle(ref, () => ({
        execute: (options) => {
            onVerify?.('mocked-token');

            if (options.async) {
                return Promise.resolve({
                    response: 'mocked-token'
                });
            }
        }
    }));

    // Simulate the component finishing its load event
    React.useEffect(() => {
        onLoad?.();
    }, []);

    // Render a test element
    return (
        <div data-testid="hcaptcha-mock" {...props}>
            MOCK_HCAPTCHA_CONTENT
        </div>
    );
}

const HCaptchaMock = React.forwardRef(HCaptchaMockBase);

export default HCaptchaMock;
