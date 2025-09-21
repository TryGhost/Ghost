**To retrieve a certificate authority (CA) certificate**

The following ``get-certificate-authority-certificate`` command retrieves the certificate and certificate chain for the private CA specified by the ARN. ::

  aws acm-pca get-certificate-authority-certificate --certificate-authority-arn arn:aws:acm-pca:us-west-2:123456789012:certificate-authority/12345678-1234-1234-1234-123456789012 --output text