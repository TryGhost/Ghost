**To retrieve information about a function**

The following ``get-function`` example displays information about the ``my-function`` function. ::

    aws lambda get-function \
        --function-name  my-function

Output::

    {
        "Concurrency": {
            "ReservedConcurrentExecutions": 100
        },
        "Code": {
            "RepositoryType": "S3",
            "Location": "https://awslambda-us-west-2-tasks.s3.us-west-2.amazonaws.com/snapshots/123456789012/my-function..."
        },
        "Configuration": {
            "TracingConfig": {
                "Mode": "PassThrough"
            },
            "Version": "$LATEST",
            "CodeSha256": "5tT2qgzYUHoqwR616pZ2dpkn/0J1FrzJmlKidWaaCgk=",
            "FunctionName": "my-function",
            "VpcConfig": {
                "SubnetIds": [],
                "VpcId": "",
                "SecurityGroupIds": []
            },
            "MemorySize": 128,
            "RevisionId": "28f0fb31-5c5c-43d3-8955-03e76c5c1075",
            "CodeSize": 304,
            "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function",
            "Handler": "index.handler",
            "Role": "arn:aws:iam::123456789012:role/service-role/helloWorldPython-role-uy3l9qyq",
            "Timeout": 3,
            "LastModified": "2019-09-24T18:20:35.054+0000",
            "Runtime": "nodejs10.x",
            "Description": ""
        }
    }

For more information, see `AWS Lambda Function Configuration <https://docs.aws.amazon.com/lambda/latest/dg/resource-model.html>`__ in the *AWS Lambda Developer Guide*.
