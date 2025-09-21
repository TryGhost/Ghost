**To remove permissions from an existing Lambda function**

The following ``remove-permission`` example removes permission to invoke a function named ``my-function``. ::

    aws lambda remove-permission \
        --function-name my-function \
        --statement-id sns

This command produces no output.

For more information, see `Using Resource-based Policies for AWS Lambda <https://docs.aws.amazon.com/lambda/latest/dg/access-control-resource-based.html>`__ in the *AWS Lambda Developer Guide*.
