**To list domains**

The following ``list-domains`` example returns a summary of all domains owned by the AWS account that makes the call. ::

    aws codeartifact list-domains

Output::

    {
        "domains": [
            {
                "name": "my-domain",
                "owner": "111122223333",
                "status": "Active",
                "encryptionKey": "arn:aws:kms:us-west-2:111122223333:key/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
            },
            {
                "name": "test-domain",
                "owner": "111122223333",
                "status": "Active",
                "encryptionKey": "arn:aws:kms:us-west-2:111122223333:key/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"
            }
        ]
    }

For more information, see `Working with domains in CodeArtifact <https://docs.aws.amazon.com/codeartifact/latest/ug/domains.html>`__ in the *AWS CodeArtifact User Guide*.