**To delete a server certificate from your AWS account**

The following ``delete-server-certificate`` command removes the specified server certificate from your AWS account. ::

    aws iam delete-server-certificate \
        --server-certificate-name myUpdatedServerCertificate

This command produces no output.

To list the server certificates available in your AWS account, use the ``list-server-certificates`` command.

For more information, see `Managing server certificates in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html>`__ in the *AWS IAM User Guide*.