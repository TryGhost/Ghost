**To register a certificate authority (CA) certificate**

The following ``register-ca-certificate`` example registers a CA certificate. The command supplies the CA certificate and a key verification certificate that proves you own the private key associated with the CA certificate. ::

    aws iot register-ca-certificate \
        --ca-certificate file://rootCA.pem \
        --verification-cert file://verificationCert.pem

Output::

    {
        "certificateArn": "arn:aws:iot:us-west-2:123456789012:cacert/f4efed62c0142f16af278166f61962501165c4f0536295207426460058cd1467",
        "certificateId": "f4efed62c0142f16af278166f61962501165c4f0536295207426460058cd1467"
     }

For more information, see `RegisterCACertificate <https://docs.aws.amazon.com/iot/latest/apireference/API_RegisterCACertificate.html>`__ in the *AWS IoT API Reference*.
