**To list the available certificates**

The following ``describe-certificates`` example lists the available certificates in your AWS account. ::

    aws dms describe-certificates

Output::

    {
        "Certificates": [
            {
                "CertificateIdentifier": "my-cert",
                "CertificateCreationDate": 1543259542.506,
                "CertificatePem": "-----BEGIN CERTIFICATE-----\nMIID9DCCAtygAwIBAgIBQjANBgkqhkiG9w0BAQ ...U"

                ... remaining output omittted ...

            }
        ]
    }

For more information, see `Using SSL <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Security.html#CHAP_Security.SSL>`__ in the *AWS Database Migration Service User Guide*.
