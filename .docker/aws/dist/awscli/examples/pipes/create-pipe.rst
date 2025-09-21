**To Create a pipe**

The following ``create-pipe`` example creates a Pipe named ``Demo_Pipe`` with SQS as the source and CloudWatch Log Group as the target for the Pipe. ::

    aws pipes create-pipe \
        --name Demo_Pipe \
        --desired-state RUNNING \
        --role-arn arn:aws:iam::123456789012:role/service-role/Amazon_EventBridge_Pipe_Demo_Pipe_28b3aa4f \
        --source arn:aws:sqs:us-east-1:123456789012:Demo_Queue \
        --target arn:aws:logs:us-east-1:123456789012:log-group:/aws/pipes/Demo_LogGroup

Output::

    {
        "Arn": "arn:aws:pipes:us-east-1:123456789012:pipe/Demo_Pipe",
        "Name": "Demo_Pipe",
        "DesiredState": "RUNNING",
        "CurrentState": "CREATING",
        "CreationTime": "2024-10-08T12:33:59-05:00",
        "LastModifiedTime": "2024-10-08T12:33:59.684839-05:00"
    }

For more information, see `Amazon EventBridge Pipes concepts <https://docs.aws.amazon.com/eventbridge/latest/userguide/pipes-concepts.html>`__ in the *Amazon EventBridge User Guide*.