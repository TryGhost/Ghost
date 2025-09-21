**To list repositories in a domain**

The following ``list-repositories-in-domain`` example returns a summary of all repositories in the test-domain domain. ::

    aws codeartifact list-repositories-in-domain \
        --domain test-domain

Output::

    {
        "repositories": [
            {
                "name": "test-repo",
                "administratorAccount": "111122223333",
                "domainName": "test-domain",
                "domainOwner": "111122223333",
                "arn": "arn:aws:codeartifact:us-west-2:111122223333:repository/test-domain/test-repo",
                "description": "This is a test repository."
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