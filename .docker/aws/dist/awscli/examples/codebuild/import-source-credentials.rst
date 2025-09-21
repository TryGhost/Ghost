**Connect an AWS CodeBuild user to a source provider by importing credentials for the source provider.**

The following ``import-source-credentials`` example imports a token for a Bitbucket repository that uses BASIC_AUTH for its authentication type. ::

    aws codebuild import-source-credentials --server-type BITBUCKET --auth-type BASIC_AUTH --token my-Bitbucket-password --username my-Bitbucket-username

Output::

    {
        "arn": "arn:aws:codebuild:us-west-2:123456789012:token/bitbucket"
    }

For more information, see `Connect Source Providers with Access Tokens (CLI) <https://docs.aws.amazon.com/codebuild/latest/userguide/sample-access-tokens.html#sample-access-tokens-cli>`_ in the *AWS CodeBuild User Guide*.
