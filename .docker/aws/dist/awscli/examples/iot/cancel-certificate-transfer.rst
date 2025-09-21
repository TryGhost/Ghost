**To cancel the transfer a certificate to a different AWS account**

The following ``cancel-certificate-transfer`` example cancels the transfer of the specified certificate transfer. The certificate is identified by a certificate ID. You can find the ID for a certificate in the AWS IoT console. ::

    aws iot cancel-certificate-transfer \
        --certificate-id f0f33678c7c9a046e5cc87b2b1a58dfa0beec26db78addd5e605d630e05c7fc8

This command produces no output.

For more information, see `Transfer a certificate to another account <https://docs.aws.amazon.com/iot/latest/developerguide/transfer-cert.html>`__ in the *AWS IoT Core Developer Guide*.
