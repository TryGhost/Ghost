**To create a Lambda function**

The following ``create-function`` example creates a Lambda function named ``my-function``. ::

    aws lambda create-function \
        --function-name my-function \
        --runtime nodejs18.x \
        --zip-file fileb://my-function.zip \
        --handler my-function.handler \
        --role arn:aws:iam::123456789012:role/service-role/MyTestFunction-role-tges6bf4

Contents of ``my-function.zip``::

    This file is a deployment package that contains your function code and any dependencies.

Output::

    {
        "TracingConfig": {
            "Mode": "PassThrough"
        },
        "CodeSha256": "PFn4S+er27qk+UuZSTKEQfNKG/XNn7QJs90mJgq6oH8=",
        "FunctionName": "my-function",
        "CodeSize": 308,
        "RevisionId": "873282ed-4cd3-4dc8-a069-d0c647e470c6",
        "MemorySize": 128,
        "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function",
        "Version": "$LATEST",
        "Role": "arn:aws:iam::123456789012:role/service-role/MyTestFunction-role-zgur6bf4",
        "Timeout": 3,
        "LastModified": "2023-10-14T22:26:11.234+0000",
        "Handler": "my-function.handler",
        "Runtime": "nodejs18.x",
        "Description": ""
    }

For more information, see `AWS Lambda Function Configuration <https://docs.aws.amazon.com/lambda/latest/dg/resource-model.html>`__ in the *AWS Lambda Developer Guide*.
