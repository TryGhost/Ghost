**To retrieve the certificate signing request for a certificate authority**

The following ``get-certificate-authority-csr`` command retrieves the CSR for the private CA specified by the ARN. ::

  aws acm-pca get-certificate-authority-csr --certificate-authority-arn arn:aws:acm-pca:us-west-2:123456789012:certificate-authority/12345678-1234-1234-1234-123456789012 --output text