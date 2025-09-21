**To describe certificates**

The following ``describe-certificates`` example retrieves the details of the certificate associated with the user's default region. ::

    aws rds describe-certificates

Output::

    {
        "Certificates": [
            {
                "CertificateIdentifier": "rds-ca-ecc384-g1",
                "CertificateType": "CA",
                "Thumbprint": "2ee3dcc06e50192559b13929e73484354f23387d",
                "ValidFrom": "2021-05-24T22:06:59+00:00",
                "ValidTill": "2121-05-24T23:06:59+00:00",
                "CertificateArn": "arn:aws:rds:us-west-2::cert:rds-ca-ecc384-g1",
                "CustomerOverride": false
            },
            {
                "CertificateIdentifier": "rds-ca-rsa4096-g1",
                "CertificateType": "CA",
                "Thumbprint": "19da4f2af579a8ae1f6a0fa77aa5befd874b4cab",
                "ValidFrom": "2021-05-24T22:03:20+00:00",
                "ValidTill": "2121-05-24T23:03:20+00:00",
                "CertificateArn": "arn:aws:rds:us-west-2::cert:rds-ca-rsa4096-g1",
                "CustomerOverride": false
            },
            {
                "CertificateIdentifier": "rds-ca-rsa2048-g1",
                "CertificateType": "CA",
                "Thumbprint": "7c40cb42714b6fdb2b296f9bbd0e8bb364436a76",
                "ValidFrom": "2021-05-24T21:59:00+00:00",
                "ValidTill": "2061-05-24T22:59:00+00:00",
                "CertificateArn": "arn:aws:rds:us-west-2::cert:rds-ca-rsa2048-g1",
                "CustomerOverride": true,
                "CustomerOverrideValidTill": "2061-05-24T22:59:00+00:00"
            },
            {
                "CertificateIdentifier": "rds-ca-2019",
                "CertificateType": "CA",
                "Thumbprint": "d40ddb29e3750dffa671c3140bbf5f478d1c8096",
                "ValidFrom": "2019-08-22T17:08:50+00:00",
                "ValidTill": "2024-08-22T17:08:50+00:00",
                "CertificateArn": "arn:aws:rds:us-west-2::cert:rds-ca-2019",
                "CustomerOverride": false
            }
        ],
        "DefaultCertificateForNewLaunches": "rds-ca-rsa2048-g1"
    }

For more information, see `Using SSL/TLS to encrypt a connection to a DB instance <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html>`__ in the *Amazon RDS User Guide* and `Using SSL/TLS to encrypt a connection to a DB cluster <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.SSL.html>`__ in the *Amazon Aurora User Guide*.