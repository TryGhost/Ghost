**To create a domain**

The following ``create-domain`` example creates a domain named test-domain. ::

    aws codeartifact create-domain \
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
            "repositoryCount": 0,
            "assetSizeBytes": 0
        }
    }

For more information, see `Create a domain <https://docs.aws.amazon.com/codeartifact/latest/ug/domain-create.html>`__ in the *AWS CodeArtifact User Guide*.