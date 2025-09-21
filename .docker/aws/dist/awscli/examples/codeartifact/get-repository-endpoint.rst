**To get a repository's URL endpoint**

The following ``get-repository-endpoint`` example returns the npm endpoint for the test-repo repository. ::

    aws codeartifact get-repository-endpoint \
        --domain test-domain \
        --repository test-repo \
        --format npm

Output::

    {
        "repositoryEndpoint": "https://test-domain-111122223333.d.codeartifact.us-west-2.amazonaws.com/npm/test-repo/"
    }

For more information, see `Connect to a repository <https://docs.aws.amazon.com/codeartifact/latest/ug/connect-repo.html>`__ in the *AWS CodeArtifact User Guide*.