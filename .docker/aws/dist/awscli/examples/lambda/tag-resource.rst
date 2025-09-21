**To add tags to an existing Lambda function**

The following ``tag-resource`` example adds a tag with the key name ``DEPARTMENT`` and a value of ``Department A`` to the specified Lambda function. ::

    aws lambda tag-resource \
        --resource arn:aws:lambda:us-west-2:123456789012:function:my-function \
        --tags "DEPARTMENT=Department A"

This command produces no output.

For more information, see `Tagging Lambda Functions <https://docs.aws.amazon.com/lambda/latest/dg/tagging.html>`__ in the *AWS Lambda Developer Guide*.
