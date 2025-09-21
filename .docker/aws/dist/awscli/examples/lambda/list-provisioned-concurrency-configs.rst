**To get a list of provisioned concurrency configurations**

The following ``list-provisioned-concurrency-configs`` example lists the provisioned concurrency configurations for the specified function. ::

    aws lambda list-provisioned-concurrency-configs \
        --function-name my-function

Output::

    {
        "ProvisionedConcurrencyConfigs": [
            {
                "FunctionArn": "arn:aws:lambda:us-east-2:123456789012:function:my-function:GREEN",
                "RequestedProvisionedConcurrentExecutions": 100,
                "AvailableProvisionedConcurrentExecutions": 100,
                "AllocatedProvisionedConcurrentExecutions": 100,
                "Status": "READY",
                "LastModified": "2019-12-31T20:29:00+0000"
            },
            {
                "FunctionArn": "arn:aws:lambda:us-east-2:123456789012:function:my-function:BLUE",
                "RequestedProvisionedConcurrentExecutions": 100,
                "AvailableProvisionedConcurrentExecutions": 100,
                "AllocatedProvisionedConcurrentExecutions": 100,
                "Status": "READY",
                "LastModified": "2019-12-31T20:28:49+0000"
            }
        ]
    }
