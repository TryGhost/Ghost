**To create a certificate authority audit report**

The following ``create-certificate-authority-audit-report`` command creates an audit report for the private CA identified by the ARN. ::

  aws acm-pca create-certificate-authority-audit-report --certificate-authority-arn arn:aws:acm-pca:us-east-1:accountid:certificate-authority/12345678-1234-1234-1234-123456789012 --s3-bucket-name your-bucket-name --audit-report-response-format JSON