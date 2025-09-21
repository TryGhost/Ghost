**To update a certificate authority (CA) certificate**

The following ``update-ca-certificate`` example sets the specified CA certificate to ACTIVE status. ::

    aws iot update-ca-certificate \
        --certificate-id f4efed62c0142f16af278166f61962501165c4f0536295207426460058cd1467 \
        --new-status ACTIVE

This command produces no output.

For more information, see `UpdateCACertificate <https://docs.aws.amazon.com/iot/latest/apireference/API_UpdateCACertificate.html>`__ in the *AWS IoT API Reference*.
