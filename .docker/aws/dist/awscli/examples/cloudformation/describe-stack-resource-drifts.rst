**To get information about resources that drifted from the stack definition**

The following command displays information about drifted resources for the specified stack. To initiate drift detection, use the ``detect-stack-drift`` command.::

    aws cloudformation describe-stack-resource-drifts \
        --stack-name my-stack

The output shows an AWS Lambda function that was modified out-of-band::

    {
        "StackResourceDrifts": [
            {
                "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
                "LogicalResourceId": "function",
                "PhysicalResourceId": "my-function-SEZV4XMPL4S5",
                "ResourceType": "AWS::Lambda::Function",
                "ExpectedProperties": "{\"Description\":\"Write a file to S3.\",\"Environment\":{\"Variables\":{\"bucket\":\"my-stack-bucket-1vc62xmplgguf\"}},\"Handler\":\"index.handler\",\"MemorySize\":128,\"Role\":\"arn:aws:iam::123456789012:role/my-functionRole-HIZXMPLEOM9E\",\"Runtime\":\"nodejs10.x\",\"Tags\":[{\"Key\":\"lambda:createdBy\",\"Value\":\"SAM\"}],\"Timeout\":900,\"TracingConfig\":{\"Mode\":\"Active\"}}",
                "ActualProperties": "{\"Description\":\"Write a file to S3.\",\"Environment\":{\"Variables\":{\"bucket\":\"my-stack-bucket-1vc62xmplgguf\"}},\"Handler\":\"index.handler\",\"MemorySize\":256,\"Role\":\"arn:aws:iam::123456789012:role/my-functionRole-HIZXMPLEOM9E\",\"Runtime\":\"nodejs10.x\",\"Tags\":[{\"Key\":\"lambda:createdBy\",\"Value\":\"SAM\"}],\"Timeout\":22,\"TracingConfig\":{\"Mode\":\"Active\"}}",
                "PropertyDifferences": [
                    {
                        "PropertyPath": "/MemorySize",
                        "ExpectedValue": "128",
                        "ActualValue": "256",
                        "DifferenceType": "NOT_EQUAL"
                    },
                    {
                        "PropertyPath": "/Timeout",
                        "ExpectedValue": "900",
                        "ActualValue": "22",
                        "DifferenceType": "NOT_EQUAL"
                    }
                ],
                "StackResourceDriftStatus": "MODIFIED",
                "Timestamp": "2019-10-02T05:54:44.064Z"
            }
        ]
    }
