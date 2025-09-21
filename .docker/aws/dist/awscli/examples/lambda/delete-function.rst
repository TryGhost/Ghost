**Example 1: To delete a Lambda function by function name**

The following ``delete-function`` example deletes the Lambda function named ``my-function`` by specifying the function's name. ::

    aws lambda delete-function \
        --function-name my-function

This command produces no output.

**Example 2: To delete a Lambda function by function ARN**

The following ``delete-function`` example deletes the Lambda function named ``my-function`` by specifying the function's ARN. ::

    aws lambda delete-function \
        --function-name arn:aws:lambda:us-west-2:123456789012:function:my-function

This command produces no output.

**Example 3: To delete a Lambda function by partial function ARN**

The following ``delete-function`` example deletes the Lambda function named ``my-function`` by specifying the function's partial ARN. ::

    aws lambda delete-function \
        --function-name 123456789012:function:my-function

This command produces no output.

For more information, see `AWS Lambda Function Configuration <https://docs.aws.amazon.com/lambda/latest/dg/resource-model.html>`__ in the *AWS Lambda Developer Guide*.
