**To retrieve a list of Lambda functions**

The following ``list-functions`` example displays a list of all of the functions for the current user. ::

    aws lambda list-functions

Output::

    {
        "Functions": [
            {
                "TracingConfig": {
                    "Mode": "PassThrough"
                },
                "Version": "$LATEST",
                "CodeSha256": "dBG9m8SGdmlEjw/JYXlhhvCrAv5TxvXsbL/RMr0fT/I=",
                "FunctionName": "helloworld",
                "MemorySize": 128,
                "RevisionId": "1718e831-badf-4253-9518-d0644210af7b",
                "CodeSize": 294,
                "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:helloworld",
                "Handler": "helloworld.handler",
                "Role": "arn:aws:iam::123456789012:role/service-role/MyTestFunction-role-zgur6bf4",
                "Timeout": 3,
                "LastModified": "2023-09-23T18:32:33.857+0000",
                "Runtime": "nodejs18.x",
                "Description": ""
            },
            {
                "TracingConfig": {
                    "Mode": "PassThrough"
                },
                "Version": "$LATEST",
                "CodeSha256": "sU0cJ2/hOZevwV/lTxCuQqK3gDZP3i8gUoqUUVRmY6E=",
                "FunctionName": "my-function",
                "VpcConfig": {
                    "SubnetIds": [],
                    "VpcId": "",
                    "SecurityGroupIds": []
                },
                "MemorySize": 256,
                "RevisionId": "93017fc9-59cb-41dc-901b-4845ce4bf668",
                "CodeSize": 266,
                "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function",
                "Handler": "index.handler",
                "Role": "arn:aws:iam::123456789012:role/service-role/helloWorldPython-role-uy3l9qyq",
                "Timeout": 3,
                "LastModified": "2023-10-01T16:47:28.490+0000",
                "Runtime": "nodejs18.x",
                "Description": ""
            },
            {
                "Layers": [
                    {
                        "CodeSize": 41784542,
                        "Arn": "arn:aws:lambda:us-west-2:420165488524:layer:AWSLambda-Python37-SciPy1x:2"
                    },
                    {
                        "CodeSize": 4121,
                        "Arn": "arn:aws:lambda:us-west-2:123456789012:layer:pythonLayer:1"
                    }
                ],
                "TracingConfig": {
                    "Mode": "PassThrough"
                },
                "Version": "$LATEST",
                "CodeSha256": "ZQukCqxtkqFgyF2cU41Avj99TKQ/hNihPtDtRcc08mI=",
                "FunctionName": "my-python-function",
                "VpcConfig": {
                    "SubnetIds": [],
                    "VpcId": "",
                    "SecurityGroupIds": []
                },
                "MemorySize": 128,
                "RevisionId": "80b4eabc-acf7-4ea8-919a-e874c213707d",
                "CodeSize": 299,
                "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:my-python-function",
                "Handler": "lambda_function.lambda_handler",
                "Role": "arn:aws:iam::123456789012:role/service-role/my-python-function-role-z5g7dr6n",
                "Timeout": 3,
                "LastModified": "2023-10-01T19:40:41.643+0000",
                "Runtime": "python3.11",
                "Description": ""
            }
        ]
    }

For more information, see `AWS Lambda Function Configuration <https://docs.aws.amazon.com/lambda/latest/dg/resource-model.html>`__ in the *AWS Lambda Developer Guide*.