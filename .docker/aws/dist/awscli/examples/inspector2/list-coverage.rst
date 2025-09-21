**Example 1: To list coverage details about your environment**

The following ``list-coverage`` example lists your environment's coverage details. ::

    aws inspector2 list-coverage

Output::

    {
        "coveredResources": [
            {
                "accountId": "123456789012",
                "lastScannedAt": "2024-05-20T16:23:20-07:00",
                "resourceId": "i-EXAMPLE55555555555",
                "resourceMetadata": {
                    "ec2": {
                        "amiId": "ami-EXAMPLE6666666666",
                        "platform": "LINUX"
                    }
                },
                "resourceType": "AWS_EC2_INSTANCE",
                "scanStatus": {
                    "reason": "SUCCESSFUL",
                    "statusCode": "ACTIVE"
                },
                "scanType": "PACKAGE"
            }
        ]
    }

**Example 2: To list coverage details about the Lambda function resource type**

The following ``list-coverage`` example lists your Lamda function resource type details. ::

    aws inspector2 list-coverage
        --filter-criteria '{"resourceType":[{"comparison":"EQUALS","value":"AWS_LAMBDA_FUNCTION"}]}'

Output::

    {
        "coveredResources": [
            {
                "accountId": "123456789012",
                "resourceId": "arn:aws:lambda:us-west-2:123456789012:function:Eval-container-scan-results:$LATEST",
                "resourceMetadata": {
                    "lambdaFunction": {
                        "functionName": "Eval-container-scan-results",
                        "functionTags": {},
                        "layers": [],
                        "runtime": "PYTHON_3_7"
                    }
                },
                "resourceType": "AWS_LAMBDA_FUNCTION",
                "scanStatus": {
                    "reason": "SUCCESSFUL",
                    "statusCode": "ACTIVE"
                },
                "scanType": "CODE"
            }
        ]
    }
