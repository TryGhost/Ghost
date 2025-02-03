import React from 'react';

function HCaptchaMockBase({onLoad, onVerify, ...props}, ref) {
    // Provide mock execute method
    React.useImperativeHandle(ref, () => ({
        execute: () => {
            // Simulate successful CAPTCHA token
            onVerify?.('mocked-token');
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
