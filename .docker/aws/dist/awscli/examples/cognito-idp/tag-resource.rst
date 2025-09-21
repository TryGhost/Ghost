**To tag a user pool**

The following ``tag-resource`` example applies ``administrator`` and ``department`` tags to the requested user pool. ::

    aws cognito-idp tag-resource \
        --resource-arn arn:aws:cognito-idp:us-west-2:123456789012:userpool/us-west-2_EXAMPLE \
        --tags administrator=Jie,tenant=ExampleCorp

This command produces no output.

For more information, see `Tagging Amazon Cognito resources <https://docs.aws.amazon.com/cognito/latest/developerguide/tagging.html>`__ in the *Amazon Cognito Developer Guide*.
