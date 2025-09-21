**To list repositories**

The following ``list-repositories`` example returns a summary of all repositories in domain owned by the AWS account that makes the call. ::

    aws codeartifact list-repositories

Output::

    {
        "repositories": [
            {
                "name": "npm-store",
                "administratorAccount": "111122223333",
                "domainName": "my-domain",
                "domainOwner": "111122223333",
                "arn": "arn:aws:codeartifact:us-west-2:111122223333:repository/my-domain/npm-store",
                "description": "Provides npm artifacts from npm, Inc."
            },
            {
                "name": "target-repo",
                "administratorAccount": "111122223333",
                "domainName": "my-domain",
                "domainOwner": "111122223333",
                "arn": "arn:aws:codeartifact:us-west-2:111122223333:repository/my-domain/target-repo",
                "description": "test target repo"
            },
            {
                "name": "test-repo2",
                "administratorAccount": "111122223333",
                "domainName": "test-domain",
                "domainOwner": "111122223333",
                "arn": "arn:aws:codeartifact:us-west-2:111122223333:repository/test-domain/test-repo2",
                "description": "This is a test repository."
            }
        ]
    }

For more information, see `List repositories <https://docs.aws.amazon.com/codeartifact/latest/ug/list-repos.html>`__ in the *AWS CodeArtifact User Guide*.