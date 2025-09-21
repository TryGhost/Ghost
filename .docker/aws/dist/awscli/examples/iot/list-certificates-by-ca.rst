**To list all device certificates signed with a CA certificate**

The following ``list-certificates-by-ca`` example lists all device certificates in your AWS account that are signed with the specified CA certificate. ::

    aws iot list-certificates-by-ca \
        --ca-certificate-id f4efed62c0142f16af278166f61962501165c4f0536295207426460058cd1467

Output::

    {
        "certificates": [
            {
                "certificateArn": "arn:aws:iot:us-west-2:123456789012:cert/488b6a7f2acdeb00a77384e63c4e40b18b1b3caaae57b7272ba44c45e3448142",
                "certificateId": "488b6a7f2acdeb00a77384e63c4e40b18b1b3caaae57b7272ba44c45e3448142",
                "status": "ACTIVE",
                "creationDate": 1569363250.557
            }
        ]
    }

For more information, see `ListCertificatesByCA <https://docs.aws.amazon.com/iot/latest/apireference/API_ListCertificatesByCA.html>`__ in the *AWS IoT API Reference*.
