**To transfer a device certificate to a different AWS account**

The following ``transfer-certificate`` example transfers a device certificate to another AWS account. The certificate and AWS account are identified by ID. ::

    aws iot transfer-certificate \
        --certificate-id 488b6a7f2acdeb00a77384e63c4e40b18b1b3caaae57b7272ba44c45e3448142 \
        --target-aws-account 030714055129

Output::

    {
        "transferredCertificateArn": "arn:aws:iot:us-west-2:030714055129:cert/488b6a7f2acdeb00a77384e63c4e40b18b1b3caaae57b7272ba44c45e3448142"
    }

For more information, see `Transfer a certificate to another account <https://docs.aws.amazon.com/iot/latest/developerguide/transfer-cert.html>`__ in the *AWS IoT Core Developer Guide*.
