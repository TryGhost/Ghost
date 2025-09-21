**To update the code of a Lambda function**

The following ``update-function-code`` example replaces the code of the unpublished ($LATEST) version of the ``my-function`` function with the contents of the specified zip file. ::

    aws lambda update-function-code \
        --function-name  my-function \
        --zip-file fileb://my-function.zip

Output::

    {
        "FunctionName": "my-function",
        "LastModified": "2019-09-26T20:28:40.438+0000",
        "RevisionId": "e52502d4-9320-4688-9cd6-152a6ab7490d",
        "MemorySize": 256,
        "Version": "$LATEST",
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
        "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function",
        "Handler": "index.handler"
    }

For more information, see `AWS Lambda Function Configuration <https://docs.aws.amazon.com/lambda/latest/dg/resource-model.html>`__ in the *AWS Lambda Developer Guide*.
