**To temporarily override the system-default SSL/TLS certificate for new DB instances**

The following ``modify-certificates`` example temporarily overrides the system-default SSL/TLS certificate for new DB instances. ::

    aws rds modify-certificates \
        --certificate-identifier rds-ca-2019

Output::

    {
        "Certificate": {
            "CertificateIdentifier": "rds-ca-2019",
            "CertificateType": "CA",
            "Thumbprint": "EXAMPLE123456789012",
            "ValidFrom": "2019-09-19T18:16:53Z",
            "ValidTill": "2024-08-22T17:08:50Z",
            "CertificateArn": "arn:aws:rds:us-east-1::cert:rds-ca-2019",
            "CustomerOverride": true,
            "CustomerOverrideValidTill": "2024-08-22T17:08:50Z"
        }
    }

For more information, see `Rotating your SSL/TLS certificate <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL-certificate-rotation.html>`__ in the *Amazon RDS User Guide* and `Rotating your SSL/TLS certificate <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.SSL-certificate-rotation.html>`__ in the *Amazon Aurora User Guide*.