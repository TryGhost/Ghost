**To accept a device certificate transferred from a different AWS account**

The following ``accept-certificate-transfer`` example accepts a device certificate transferred from another AWS account. The certificate is identified by its ID. ::

    aws iot accept-certificate-transfer \
        --certificate-id 488b6a7f2acdeb00a77384e63c4e40b18bEXAMPLEe57b7272ba44c45e3448142

This command does not produce any output.

For more information, see `Transfer a certificate to another account <https://docs.aws.amazon.com/iot/latest/developerguide/transfer-cert.html>`__ in the *AWS IoT Core Developer Guide*.
