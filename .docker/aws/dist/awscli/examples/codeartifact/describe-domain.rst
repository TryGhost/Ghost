**To get information about a domain**

The following ``describe-domain`` example returns a DomainDescription object for a domain named test-domain. ::

    aws codeartifact describe-domain \
        --domain test-domain

Output::

    {
        "domain": {
            "name": "test-domain",
            "owner": "111122223333",
            "arn": "arn:aws:codeartifact:us-west-2:111122223333:domain/test-domain",
            "status": "Active",
            "createdTime": "2020-10-20T13:16:48.559000-04:00",
            "encryptionKey": "arn:aws:kms:us-west-2:111122223333:key/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "repositoryCount": 2,
            "assetSizeBytes": 0,
            "s3BucketArn": "arn:aws:s3:::assets-111122223333-us-west-2"
        }
    }

For more information, see `Domain overview <https://docs.aws.amazon.com/codeartifact/latest/ug/domain-overview.html>`__ in the *AWS CodeArtifact User Guide*.