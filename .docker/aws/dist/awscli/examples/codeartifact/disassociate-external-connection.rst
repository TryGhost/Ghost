**To remove an external connection from a repository**

The following ``disassociate-external-connection`` example removes an external connection to npmjs.com from a repository named test-repo. ::

    aws codeartifact disassociate-external-connection \
        --repository test-repo \
        --domain test-domain \
        --external-connection public:npmjs

Output::

    {
        "repository": {
            "name": "test-repo",
            "administratorAccount": "111122223333",
            "domainName": "test-domain",
            "domainOwner": "111122223333",
            "arn": "arn:aws:codeartifact:us-west-2:111122223333:repository/test-domain/test-repo",
            "upstreams": [],
            "externalConnections": []
        }
    }

For more information, see `Remove an external connection <https://docs.aws.amazon.com/codeartifact/latest/ug/external-connection.html#removing-an-external-connection>`__ in the *AWS CodeArtifact User Guide*.