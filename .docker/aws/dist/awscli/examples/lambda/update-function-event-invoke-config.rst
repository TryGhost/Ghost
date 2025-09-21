**To update an asynchronous invocation configuration**

The following ``update-function-event-invoke-config`` example adds an on-failure destination to the existing asynchronous invocation configuration for the specified function. ::

    aws lambda update-function-event-invoke-config \
        --function-name my-function \
        --destination-config '{"OnFailure":{"Destination": "arn:aws:sqs:us-east-2:123456789012:destination"}}'

Output::

    {
        "LastModified": 1573687896.493,
        "FunctionArn": "arn:aws:lambda:us-east-2:123456789012:function:my-function:$LATEST",
        "MaximumRetryAttempts": 0,
        "MaximumEventAgeInSeconds": 3600,
        "DestinationConfig": {
            "OnSuccess": {},
            "OnFailure": {
                "Destination": "arn:aws:sqs:us-east-2:123456789012:destination"
            }
        }
    }
