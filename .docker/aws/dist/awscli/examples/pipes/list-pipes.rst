**To retrieve a list of Pipes**

The following ``list-pipes`` example shows all the pipes in the specified account. ::

    aws pipes list-pipes

Output::

    {
        "Pipes": [
            {
                "Name": "Demo_Pipe",
                "Arn": "arn:aws:pipes:us-east-1:123456789012:pipe/Demo_Pipe",
                "DesiredState": "RUNNING",
                "CurrentState": "RUNNING",
                "StateReason": "User initiated",
                "CreationTime": "2024-10-08T09:29:10-05:00",
                "LastModifiedTime": "2024-10-08T10:23:47-05:00",
                "Source": "arn:aws:sqs:us-east-1:123456789012:Demo_Queue",
                "Target": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/pipes/Demo_LogGroup"
            }
        ]
    }

For more information, see `Amazon EventBridge Pipes concepts <https://docs.aws.amazon.com/eventbridge/latest/userguide/pipes-concepts.html>`__ in the *Amazon EventBridge User Guide*.