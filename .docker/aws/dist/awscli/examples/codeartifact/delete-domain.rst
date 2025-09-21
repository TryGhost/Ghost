**To delete a domain**

The following ``delete-domain`` example deletes a domain named ``test-domain``. ::

    aws codeartifact delete-domain \
        --domain test-domain

Output::

    {
        "domain": {
            "name": "test-domain",
            "owner": "417498243647",
            "arn": "arn:aws:codeartifact:us-west-2:417498243647:domain/test-domain",
            "status": "Deleted",
            "createdTime": "2020-10-20T13:16:48.559000-04:00",
            "encryptionKey": "arn:aws:kms:us-west-2:417498243647:key/c9fe2447-0795-4fda-afbe-8464574ae162",
            "repositoryCount": 0,
            "assetSizeBytes": 0
        }
    }

For more information, see `Delete a domain <https://docs.aws.amazon.com/codeartifact/latest/ug/delete-domain.html>`__ in the *AWS CodeArtifact User Guide*.