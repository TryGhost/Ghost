**To view a list of asynchronous invocation configurations**

The following ``list-function-event-invoke-configs`` example lists the asynchronous invocation configurations for the specified function. ::

    aws lambda list-function-event-invoke-configs \
        --function-name my-function

Output::

    {
        "FunctionEventInvokeConfigs": [
            {
                "LastModified": 1577824406.719,
                "FunctionArn": "arn:aws:lambda:us-east-2:123456789012:function:my-function:GREEN",
                "MaximumRetryAttempts": 2,
                "MaximumEventAgeInSeconds": 1800
            },
            {
                "LastModified": 1577824396.653,
                "FunctionArn": "arn:aws:lambda:us-east-2:123456789012:function:my-function:BLUE",
                "MaximumRetryAttempts": 0,
                "MaximumEventAgeInSeconds": 3600
            }
        ]
    }
