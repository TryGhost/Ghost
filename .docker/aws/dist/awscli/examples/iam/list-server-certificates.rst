**To list the server certificates in your AWS account**

The following ``list-server-certificates`` command lists all of the server certificates stored and available for use in your AWS account. ::

    aws iam list-server-certificates

Output::

    {
        "ServerCertificateMetadataList": [
            {
                "Path": "/",
                "ServerCertificateName": "myUpdatedServerCertificate",
                "ServerCertificateId": "ASCAEXAMPLE123EXAMPLE",
                "Arn": "arn:aws:iam::123456789012:server-certificate/myUpdatedServerCertificate",
                "UploadDate": "2019-04-22T21:13:44+00:00",
                "Expiration": "2019-10-15T22:23:16+00:00"
            },
            {
                "Path": "/cloudfront/",
                "ServerCertificateName": "MyTestCert",
                "ServerCertificateId": "ASCAEXAMPLE456EXAMPLE",
                "Arn": "arn:aws:iam::123456789012:server-certificate/Org1/Org2/MyTestCert",
                "UploadDate": "2015-04-21T18:14:16+00:00",
                "Expiration": "2018-01-14T17:52:36+00:00"
            }
        ]
    }

For more information, see `Managing server certificates in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html>`__ in the *AWS IAM User Guide*.