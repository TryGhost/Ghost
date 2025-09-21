**To update the mapping between an event source and an AWS Lambda function**

The following ``update-event-source-mapping`` example updates the batch size to 8 in the specified mapping. ::

    aws lambda update-event-source-mapping \
        --uuid  "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE" \
        --batch-size 8

Output::

    {
        "UUID": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
        "StateTransitionReason": "USER_INITIATED",
        "LastModified": 1569284520.333,
        "BatchSize": 8,
        "State": "Updating",
        "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function",
        "EventSourceArn": "arn:aws:sqs:us-west-2:123456789012:mySQSqueue"
    }

For more information, see `AWS Lambda Event Source Mapping <https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html>`__ in the *AWS Lambda Developer Guide*.
