**To list user pool tags**

The following ``list-tags-for-resource`` example lists the tags assigned to the user pool with the requested ARN. ::

    aws cognito-idp list-tags-for-resource \
        --resource-arn arn:aws:cognito-idp:us-west-2:123456789012:userpool/us-west-2_EXAMPLE

Output::

    {
        "Tags": {
            "administrator": "Jie",
            "tenant": "ExampleCorp"
        }
    }

For more information, see `Tagging Amazon Cognito resources <https://docs.aws.amazon.com/cognito/latest/developerguide/tagging.html>`__ in the *Amazon Cognito Developer Guide*.
