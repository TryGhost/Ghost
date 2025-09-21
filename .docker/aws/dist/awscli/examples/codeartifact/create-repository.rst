**To create a repository**

The following ``create-repository`` example creates a repository named test-repo inside a domain named test-domain. ::

    aws codeartifact create-repository \
        --domain test-domain \
        --domain-owner 111122223333 \
        --repository test-repo \ 
        --description "This is a test repository."

Output::

    {
        "repository": {
            "name": "test-repo",
            "administratorAccount": "111122223333",
            "domainName": "test-domain",
            "domainOwner": "111122223333",
            "arn": "arn:aws:codeartifact:us-west-2:111122223333:repository/test-domain/test-repo",
            "description": "This is a test repository.",
            "upstreams": [],
            "externalConnections": []
        }
    }

For more information, see `Create a domain <https://docs.aws.amazon.com/codeartifact/latest/ug/create-repo.html>`__ in the *AWS CodeArtifact User Guide*.