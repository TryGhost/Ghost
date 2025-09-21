**To export a private certificate issued by a private CA.**

The following ``export-certificate`` command exports a private certificate, certificate chain, and private key to your display::

  aws acm export-certificate --certificate-arn arn:aws:acm:region:account:certificate/12345678-1234-1234-1234-123456789012 --passphrase file://path-to-passphrase-file

To export the certificate, chain, and private key to a local file, use the following command::

  aws acm export-certificate --certificate-arn arn:aws:acm:region:sccount:certificate/12345678-1234-1234-1234-123456789012 --passphrase file://path-to-passphrase-file > c:\temp\export.txt
