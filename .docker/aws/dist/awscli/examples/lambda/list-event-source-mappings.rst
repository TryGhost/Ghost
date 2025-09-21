**To list the event source mappings for a function**

The following ``list-event-source-mappings`` example displays a list of the event source mappings for the ``my-function`` Lambda function. ::

    aws lambda list-event-source-mappings \
        --function-name my-function

Output::

    {
        "EventSourceMappings": [
            {
                "UUID": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "StateTransitionReason": "USER_INITIATED",
                "LastModified": 1569284520.333,
                "BatchSize": 5,
                "State": "Enabled",
                "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function",
                "EventSourceArn": "arn:aws:sqs:us-west-2:123456789012:mySQSqueue"
            }
        ]
    }

For more information, see `AWS Lambda Event Source Mapping <https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html>`__ in the *AWS Lambda Developer Guide*.
