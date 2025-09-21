**To update the expiry of a group's certificates**

The following ``update-group-certificate-configuration`` example sets a 10-day expiry for the certificates generated for the specified group. ::

    aws greengrass update-group-certificate-configuration \
        --group-id "8eaadd72-ce4b-4f15-892a-0cc4f3a343f1" \
        --certificate-expiry-in-milliseconds 864000000

Output::

    {
        "CertificateExpiryInMilliseconds": 864000000,
        "CertificateAuthorityExpiryInMilliseconds": 2524607999000,
        "GroupId": "8eaadd72-ce4b-4f15-892a-0cc4f3a343f1"
    }

For more information, see `AWS IoT Greengrass Security <https://docs.aws.amazon.com/greengrass/latest/developerguide/gg-sec.html>`__ in the *AWS IoT Greengrass Developer Guide*.
