**To cancel a message move task**

The following ``cancel-message-move-task`` example cancels the specified message move task. ::

    aws sqs cancel-message-move-task \
        --task-handle AQEB6nR4...HzlvZQ==

Output::

    {
        "ApproximateNumberOfMessagesMoved": 102
    }

For more information, see `Amazon SQS API permissions: Actions and resource reference <https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-api-permissions-reference.html>`__ in the *Developer Guide*.