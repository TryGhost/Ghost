**To import your certificate authority certificate into ACM PCA**

The following ``import-certificate-authority-certificate`` command imports the signed private CA certificate for the CA specified by the ARN into ACM PCA. ::

  aws acm-pca import-certificate-authority-certificate --certificate-authority-arn arn:aws:acm-pca:us-west-2:123456789012:certificate-authority/12345678-1234-1234-1234-123456789012 --certificate fileb://C:\ca_cert.pem --certificate-chain fileb://C:\ca_cert_chain.pem
