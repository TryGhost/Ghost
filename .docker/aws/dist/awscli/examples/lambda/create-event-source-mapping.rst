**To create a mapping between an event source and an AWS Lambda function**

The following ``create-event-source-mapping`` example creates a mapping between an SQS queue and the ``my-function`` Lambda function. ::

    aws lambda create-event-source-mapping \
        --function-name my-function \
        --batch-size 5 \
        --event-source-arn arn:aws:sqs:us-west-2:123456789012:mySQSqueue

Output::

    {
        "UUID": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
        "StateTransitionReason": "USER_INITIATED",
        "LastModified": 1569284520.333,
        "BatchSize": 5,
        "State": "Creating",
        "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function",
        "EventSourceArn": "arn:aws:sqs:us-west-2:123456789012:mySQSqueue"
    }

For more information, see `AWS Lambda Event Source Mapping <https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html>`__ in the *AWS Lambda Developer Guide*.
