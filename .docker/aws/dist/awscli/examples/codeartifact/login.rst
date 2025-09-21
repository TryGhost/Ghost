**To configure authentication to your repository with the login command**

The following ``login`` example configures the npm package manager with a repository named test-repo in a domain named test-domain. ::

    aws codeartifact login \
        --domain test-domain \
        --repository test-repo \
        --tool npm

Output::

    Successfully configured npm to use AWS CodeArtifact repository https://test-domain-111122223333.d.codeartifact.us-west-2.amazonaws.com/npm/test-repo/ 
    Login expires in 12 hours at 2020-11-12 01:53:16-05:00

For more information, see `Getting started with the AWS CLI <https://docs.aws.amazon.com/codeartifact/latest/ug/getting-started-cli.html>`__ in the *AWS CodeArtifact User Guide*.