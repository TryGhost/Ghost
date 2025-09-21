**To delete an alias of a Lambda function**

The following ``delete-alias`` example deletes the alias named ``LIVE`` from the ``my-function`` Lambda function. ::

    aws lambda delete-alias \
        --function-name my-function \
        --name LIVE

This command produces no output.

For more information, see `Configuring AWS Lambda Function Aliases <https://docs.aws.amazon.com/lambda/latest/dg/aliases-intro.html>`__ in the *AWS Lambda Developer Guide*.
