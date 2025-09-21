**To update the certificate options**

The following ``update-certificate-options`` command opts out of certificate transparency logging::

  aws acm update-certificate-options --certificate-arn arn:aws:acm:region:account:certificate/12345678-1234-1234-1234-123456789012 --options CertificateTransparencyLoggingPreference=DISABLED

