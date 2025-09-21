**To retrieve the version-specific settings of a Lambda function**

The following ``get-function-configuration`` example displays the settings for version 2 of the ``my-function`` function. ::

    aws lambda get-function-configuration \
        --function-name  my-function:2

Output::

    {
        "FunctionName": "my-function",
        "LastModified": "2019-09-26T20:28:40.438+0000",
        "RevisionId": "e52502d4-9320-4688-9cd6-152a6ab7490d",
        "MemorySize": 256,
        "Version": "2",
        "Role": "arn:aws:iam::123456789012:role/service-role/my-function-role-uy3l9qyq",
        "Timeout": 3,
        "Runtime": "nodejs10.x",
        "TracingConfig": {
            "Mode": "PassThrough"
        },
        "CodeSha256": "5tT2qgzYUHaqwR716pZ2dpkn/0J1FrzJmlKidWoaCgk=",
        "Description": "",
        "VpcConfig": {
            "SubnetIds": [],
            "VpcId": "",
            "SecurityGroupIds": []
        },
        "CodeSize": 304,
        "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function:2",
        "Handler": "index.handler"
    }

For more information, see `AWS Lambda Function Configuration <https://docs.aws.amazon.com/lambda/latest/dg/resource-model.html>`__ in the *AWS Lambda Developer Guide*.
