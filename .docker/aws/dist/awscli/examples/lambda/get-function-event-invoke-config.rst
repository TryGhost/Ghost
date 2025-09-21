**To view an asynchronous invocation configuration**

The following ``get-function-event-invoke-config`` example retrieves the asynchronous invocation configuration for the ``BLUE`` alias of the specified function. ::

    aws lambda get-function-event-invoke-config \
        --function-name my-function:BLUE

Output::

    {
        "LastModified": 1577824396.653,
        "FunctionArn": "arn:aws:lambda:us-east-2:123456789012:function:my-function:BLUE",
        "MaximumRetryAttempts": 0,
        "MaximumEventAgeInSeconds": 3600,
        "DestinationConfig": {
            "OnSuccess": {},
            "OnFailure": {
                "Destination": "arn:aws:sqs:us-east-2:123456789012:failed-invocations"
            }
        }
    }