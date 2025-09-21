**To remove tags from an existing Lambda function**

The following ``untag-resource`` example removes the tag with the key name ``DEPARTMENT`` tag from the ``my-function`` Lambda function. ::

    aws lambda untag-resource \
        --resource arn:aws:lambda:us-west-2:123456789012:function:my-function \
        --tag-keys DEPARTMENT

This command produces no output.

For more information, see `Tagging Lambda Functions <https://docs.aws.amazon.com/lambda/latest/dg/tagging.html>`__ in the *AWS Lambda Developer Guide*.
