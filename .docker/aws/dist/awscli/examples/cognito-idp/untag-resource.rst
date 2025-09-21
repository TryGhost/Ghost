**To remove tags from a user pool**

The following ``untag-resource`` example removes ``administrator`` and ``department`` tags from the requested user pool. ::

    aws cognito-idp untag-resource \
        --resource-arn arn:aws:cognito-idp:us-west-2:767671399759:userpool/us-west-2_l5cxwdm2K \
        --tag-keys administrator tenant

This command produces no output.

For more information, see `Tagging Amazon Cognito resources <https://docs.aws.amazon.com/cognito/latest/developerguide/tagging.html>`__ in the *Amazon Cognito Developer Guide*.
