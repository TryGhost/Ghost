**To update an audit finding suppression**

The following ``update-audit-suppression`` example updates an audit finding suppression's expiration date to 2020-09-21. ::

    aws iot update-audit-suppression \
        --check-name DEVICE_CERTIFICATE_EXPIRING_CHECK \
        --resource-identifier deviceCertificateId=c7691e<shortened> \
        --no-suppress-indefinitely \
        --expiration-date 2020-09-21

This command produces no output.

For more information, see `Audit finding suppressions <https://docs.aws.amazon.com/iot/latest/developerguide/audit-finding-suppressions.html>`__ in the *AWS IoT Developers Guide*.