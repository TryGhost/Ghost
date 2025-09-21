**To delete an audit finding suppression**

The following ``delete-audit-suppression`` example deletes an audit finding suppression for DEVICE_CERTIFICATE_EXPIRING_CHECK. ::

    aws iot delete-audit-suppression \
        --check-name DEVICE_CERTIFICATE_EXPIRING_CHECK \
        --resource-identifier deviceCertificateId="c7691e<shortened>"

This command produces no output.

For more information, see `Audit finding suppressions <https://docs.aws.amazon.com/iot/latest/developerguide/audit-finding-suppressions.html>`__ in the *AWS IoT Developers Guide*.