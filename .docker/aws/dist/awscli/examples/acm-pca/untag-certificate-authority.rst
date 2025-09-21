**To remove one or more tags from your private certificate authority**

The following ``untag-certificate-authority`` command removes tags from the private CA identified by the ARN. ::

  aws acm-pca untag-certificate-authority --certificate-authority-arn arn:aws:acm-pca:us-west-2:123456789012:certificate-authority/12345678-1234-1234-1234-123456789012 --tags Key=Purpose,Value=Website