**To get an authorization token**

The following ``get-authorization-token`` example retrieves a CodeArtifact authorization token. ::

    aws codeartifact get-authorization-token \
        --domain test-domain \
        --query authorizationToken \
        --output text

Output::

    This command will return the authorization token. You can store the output in an environment variable when calling the command. 

For more information, see `Configure pip without the login command <https://docs.aws.amazon.com/codeartifact/latest/ug/python-configure-without-pip.html>`__ in the *AWS CodeArtifact User Guide*.