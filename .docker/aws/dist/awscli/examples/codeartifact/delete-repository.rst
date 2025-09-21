**To delete a repository**

The following ``delete-repository`` example deletes a repository named ``test-repo`` in a domain named ``test-domain``. ::

    aws codeartifact delete-repository \
        --domain test-domain \
        --repository test-repo

Output::

    {
        "repository": {
            "name": "test-repo",
            "administratorAccount": "111122223333",
            "domainName": "test-domain",
            "domainOwner": "111122223333",
            "arn": "arn:aws:codeartifact:us-west-2:111122223333:repository/test-domain/test-repo",
            "description": "This is a test repository",
            "upstreams": [],
            "externalConnections": []
        }
    }

For more information, see `Delete a repository <https://docs.aws.amazon.com/codeartifact/latest/ug/delete-repo.html>`__ in the *AWS CodeArtifact User Guide*.