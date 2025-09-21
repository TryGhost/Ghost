**To update a repository**

The following ``update-repository`` example updates the description of a repo named test-repo in a domain named test-domain to "this is an updated description". ::

    aws codeartifact update-repository \
        --domain test-domain \
        --repository test-repo \
        --description "this is an updated description"

Output::

    {
        "repository": {
            "name": "test-repo",
            "administratorAccount": "111122223333",
            "domainName": "test-domain",
            "domainOwner": "111122223333",
            "arn": "arn:aws:codeartifact:us-west-2:111122223333:repository/test-domain/test-repo",
            "description": "this is an updated description",
            "upstreams": [],
            "externalConnections": []
        }
    }

For more information, see `View or modify a repository configuration <https://docs.aws.amazon.com/codeartifact/latest/ug/config-repos.html>`__ in the *AWS CodeArtifact User Guide*.