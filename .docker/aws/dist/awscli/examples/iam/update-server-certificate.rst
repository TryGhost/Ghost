**To change the path or name of a server certificate in your AWS account**

The following ``update-server-certificate`` command changes the name of the certificate from ``myServerCertificate`` to ``myUpdatedServerCertificate``. It also changes the path to ``/cloudfront/`` so that it can be accessed by the Amazon CloudFront service. This command produces no output. You can see the results of the update by running the ``list-server-certificates`` command. ::

    aws-iam update-server-certificate \
        --server-certificate-name myServerCertificate \
        --new-server-certificate-name myUpdatedServerCertificate \
        --new-path /cloudfront/

This command produces no output.

For more information, see `Managing server certificates in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html>`__ in the *AWS IAM User Guide*.