**To update the configuration of your private certificate authority**

The following ``update-certificate-authority`` command updates the status and configuration of the private CA identified by the ARN. ::

  aws acm-pca update-certificate-authority --certificate-authority-arn arn:aws:acm-pca:us-west-2:123456789012:certificate-authority/12345678-1234-1234-1234-1232456789012 --revocation-configuration file://C:\revoke_config.txt --status "DISABLED"