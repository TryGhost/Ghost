**To delete the mapping between an event source and an AWS Lambda function**

The following ``delete-event-source-mapping`` example deletes the mapping between an SQS queue and the ``my-function`` Lambda function. ::

    aws lambda delete-event-source-mapping \
        --uuid  a1b2c3d4-5678-90ab-cdef-11111EXAMPLE

Output::

    {
        "UUID": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
        "StateTransitionReason": "USER_INITIATED",
        "LastModified": 1569285870.271,
        "BatchSize": 5,
        "State": "Deleting",
        "FunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function",
        "EventSourceArn": "arn:aws:sqs:us-west-2:123456789012:mySQSqueue"
    }

For more information, see `AWS Lambda Event Source Mapping <https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html>`__ in the *AWS Lambda Developer Guide*.
