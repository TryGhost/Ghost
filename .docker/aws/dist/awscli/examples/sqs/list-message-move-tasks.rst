**To list the message move tasks**

The following ``list-message-move-tasks`` example lists the 2 most recent message move tasks in the specified queue. ::

    aws sqs list-message-move-tasks \
        --source-arn arn:aws:sqs:us-west-2:80398EXAMPLE:MyQueue \
        --max-results 2

Output::

    {
        "Results": [
            {
                "TaskHandle": "AQEB6nR4...HzlvZQ==",
                "Status": "RUNNING",
                "SourceArn": "arn:aws:sqs:us-west-2:80398EXAMPLE:MyQueue1",
                "DestinationArn": "arn:aws:sqs:us-west-2:80398EXAMPLE:MyQueue2",
                "MaxNumberOfMessagesPerSecond": 50,
                "ApproximateNumberOfMessagesMoved": 203,
                "ApproximateNumberOfMessagesToMove": 30,
                "StartedTimestamp": 1442428276921
             },
             
             {
                "Status": "COMPLETED",
                "SourceArn": "arn:aws:sqs:us-west-2:80398EXAMPLE:MyQueue1",
                "DestinationArn": "arn:aws:sqs:us-west-2:80398EXAMPLE:MyQueue2",
                "ApproximateNumberOfMessagesMoved": 29,
                "ApproximateNumberOfMessagesToMove": 0,
                "StartedTimestamp": 1342428272093
             }
        ]
    }

For more information, see `Amazon SQS API permissions: Actions and resource reference <https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-api-permissions-reference.html>`__ in the *Developer Guide*.