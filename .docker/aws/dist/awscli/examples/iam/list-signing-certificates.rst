**To list the signing certificates for an IAM user**

The following ``list-signing-certificates`` command lists the signing certificates for the IAM user named ``Bob``. ::

    aws iam list-signing-certificates \
        --user-name Bob

Output::

    {
        "Certificates": [
            {
                "UserName": "Bob",
                "Status": "Inactive",
                "CertificateBody": "-----BEGIN CERTIFICATE-----<certificate-body>-----END CERTIFICATE-----",
                "CertificateId": "TA7SMP42TDN5Z26OBPJE7EXAMPLE",
                "UploadDate": "2013-06-06T21:40:08Z"
            }
        ]
    }

For more information, see `Manage signing certificates <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/set-up-ami-tools.html#ami-tools-managing-certs>`__ in the *Amazon EC2 User Guide*.