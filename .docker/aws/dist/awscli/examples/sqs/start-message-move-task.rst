*Example 1: *To start a message move task**

The following ``start-message-move-task`` example starts a message move task to redrive messages from the specified dead-letter queue to the source queue. ::

    aws sqs start-message-move-task \
        --source-arn arn:aws:sqs:us-west-2:80398EXAMPLE:MyQueue

Output::

    {
        "TaskHandle": "AQEB6nR4...HzlvZQ=="
    }

For more information, see `This is the topic title <https://link.to.the/topic/page>`__ in the *Name of your guide*.

*Example 2: *To start a message move task with a maximum rate**

The following ``start-message-move-task`` example starts a message move task to redrive messages from the specified dead-letter queue to the specified destination queue at a maximum rate of 50 messages per second.  ::

    aws sqs start-message-move-task \
        --source-arn arn:aws:sqs:us-west-2:80398EXAMPLE:MyQueue1 \
        --destination-arn arn:aws:sqs:us-west-2:80398EXAMPLE:MyQueue2 \
        --max-number-of-messages-per-second 50

Output::

    {
        "TaskHandle": "AQEB6nR4...HzlvZQ=="
    }

For more information, see `Amazon SQS API permissions: Actions and resource reference <https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-api-permissions-reference.html>`__ in the *Developer Guide*.