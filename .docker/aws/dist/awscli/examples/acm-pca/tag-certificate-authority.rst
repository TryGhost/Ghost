**To attach tags to a private certificate authority**

The following ``tag-certificate-authority`` command attaches one or more tags to your private CA. ::

  aws acm-pca tag-certificate-authority --certificate-authority-arn arn:aws:acm-pca:us-west-2:123456789012:certificate-authority/12345678-1234-1234-1234-123456789012 --tags Key=Admin,Value=Alice