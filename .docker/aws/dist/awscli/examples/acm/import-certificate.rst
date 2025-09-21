**To import a certificate into ACM.**

The following ``import-certificate`` command imports a certificate into ACM. Replace the file names with your own::

  aws acm import-certificate --certificate file://Certificate.pem --certificate-chain file://CertificateChain.pem --private-key file://PrivateKey.pem
