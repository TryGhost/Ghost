**To publish a new version of a function**

The following ``publish-version`` example publishes a new version of the ``my-function`` Lambda function. ::

    aws lambda publish-version \
        --function-name my-function

Output::

    {
        "TracingConfig": {
            "Mode": "PassThrough"
        },
        "CodeSha256": "dBG9m8SGdmlEjw/JYXlhhvCrAv5TxvXsbL/RMr0fT/I=",
        "FunctionName": "my-function",
        "CodeSize": 294,
        "RevisionId": "f31d3d39-cc63-4520-97d4-43cd44c94c20",
        "MemorySize": 128,
        "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function:3",
        "Version": "2",
        "Role": "arn:aws:iam::123456789012:role/service-role/MyTestFunction-role-zgur6bf4",
        "Timeout": 3,
        "LastModified": "2019-09-23T18:32:33.857+0000",
        "Handler": "my-function.handler",
        "Runtime": "nodejs10.x",
        "Description": ""
    }

For more information, see `Configuring AWS Lambda Function Aliases <https://docs.aws.amazon.com/lambda/latest/dg/aliases-intro.html>`__ in the *AWS Lambda Developer Guide*.
