**To list all audit finding suppressions**

The following ``list-audit-suppressions`` example lists all active audit finding suppressions. ::

    aws iot list-audit-suppressions

Output::

    {
        "suppressions": [
            {
            "checkName": "DEVICE_CERTIFICATE_EXPIRING_CHECK",
                "resourceIdentifier": {
                    "deviceCertificateId": "c7691e<shortened>"
                },
            "expirationDate": 1597881600.0,
            "suppressIndefinitely": false
            }
        ]
    }

For more information, see `Audit finding suppressions <https://docs.aws.amazon.com/iot/latest/developerguide/audit-finding-suppressions.html>`__ in the *AWS IoT Developers Guide*.