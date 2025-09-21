**To retrieve information about a Pipe**

The following ``describe-pipe`` example displays information about the Pipe ``Demo_Pipe`` in the specified account. ::

    aws pipes describe-pipe \
        --name Demo_Pipe
        
Output::

    {
        "Arn": "arn:aws:pipes:us-east-1:123456789012:pipe/Demo_Pipe",
        "Name": "Demo_Pipe",
        "DesiredState": "RUNNING",
        "CurrentState": "RUNNING",
        "StateReason": "User initiated",
        "Source": "arn:aws:sqs:us-east-1:123456789012:Demo_Queue",
        "SourceParameters": {
            "SqsQueueParameters": {
                "BatchSize": 1
            }
        },
        "EnrichmentParameters": {},
        "Target": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/pipes/Demo_LogGroup",
        "TargetParameters": {},
        "RoleArn": "arn:aws:iam::123456789012:role/service-role/Amazon_EventBridge_Pipe_Demo_Pipe_28b3aa4f",
        "Tags": {},
        "CreationTime": "2024-10-08T09:29:10-05:00",
        "LastModifiedTime": "2024-10-08T10:23:47-05:00",
        "LogConfiguration": {
            "CloudwatchLogsLogDestination": {
                "LogGroupArn": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/vendedlogs/pipes/Demo_Pipe"
            },
            "Level": "ERROR"
        }
    }

For more information, see `Amazon EventBridge Pipes concepts <https://docs.aws.amazon.com/eventbridge/latest/userguide/pipes-concepts.html>`__ in the *Amazon EventBridge User Guide*.