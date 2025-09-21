**To configure error handling for asynchronous invocation**

The following ``put-function-event-invoke-config`` example sets a maximum event age of one hour and disables retries for the specified function. ::

    aws lambda put-function-event-invoke-config \
        --function-name my-function \
        --maximum-event-age-in-seconds 3600 \
        --maximum-retry-attempts 0

Output::

    {
        "LastModified": 1573686021.479,
        "FunctionArn": "arn:aws:lambda:us-east-2:123456789012:function:my-function:$LATEST",
        "MaximumRetryAttempts": 0,
        "MaximumEventAgeInSeconds": 3600,
        "DestinationConfig": {
            "OnSuccess": {},
            "OnFailure": {}
        }
    }
