**To disconnect from a source provider and remove its access tokens.**

The following ``delete-source-credentials`` example disconnects from a source provider and removes its tokens. The ARN of source credentials used to connect to the source provider determines which source credentials. ::

    aws codebuild delete-source-credentials --arn arn-of-your-credentials

Output::

    {
        "arn": "arn:aws:codebuild:your-region:your-account-id:token/your-server-type"
    }

For more information, see `Connect Source Providers with Access Tokens (CLI) <https://docs.aws.amazon.com/codebuild/latest/userguide/sample-access-tokens.html#sample-access-tokens-cli>`_ in the *AWS CodeBuild User Guide*.
