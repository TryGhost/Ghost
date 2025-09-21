**To update a device certificate**

The following ``update-certificate`` example sets the specified device certificate to INACTIVE status. ::

    aws iot update-certificate \
        --certificate-id d1eb269fb55a628552143c8f96eb3c258fcd5331ea113e766ba0c82bf225f0be \
        --new-status INACTIVE

This command produces no output.

For more information, see `UpdateCertificate <https://docs.aws.amazon.com/iot/latest/apireference/API_UpdateCertificate.html>`__ in the *AWS IoT API Reference*.
