**To retrieve the configuration for the certificate authority used by the Greengrass group**

The following ``get-group-certificate-configuration`` example retrieves the configuration for the certificate authority (CA) used by the specified Greengrass group. ::

    aws greengrass get-group-certificate-configuration \
        --group-id "1013db12-8b58-45ff-acc7-704248f66731"
    
Output::

    {
        "CertificateAuthorityExpiryInMilliseconds": 2524607999000,
        "CertificateExpiryInMilliseconds": 604800000,
        "GroupId": "1013db12-8b58-45ff-acc7-704248f66731"
    }
