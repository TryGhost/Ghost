**To update an existing pipe**

The following ``update-pipe`` example updates the Pipe named ``Demo_Pipe`` by adding a CloudWatch Log configuration parameter, enure to update the execution role of the pipe so that it has the correct permissions for Log destination. ::

    aws pipes update-pipe \
        --name Demo_Pipe \
        --desired-state RUNNING \
        --log-configuration CloudwatchLogsLogDestination={LogGroupArn=arn:aws:logs:us-east-1:123456789012:log-group:/aws/vendedlogs/pipes/Demo_Pipe},Level=TRACE \
        --role-arn arn:aws:iam::123456789012:role/service-role/Amazon_EventBridge_Pipe_Demo_Pipe_28b3aa4f 

Output::

    {
        "Arn": "arn:aws:pipes:us-east-1:123456789012:pipe/Demo_Pipe",
        "Name": "Demo_Pipe",
        "DesiredState": "RUNNING",
        "CurrentState": "UPDATING",
        "CreationTime": "2024-10-08T09:29:10-05:00",
        "LastModifiedTime": "2024-10-08T11:35:48-05:00"
    }

For more information, see `Amazon EventBridge Pipes concepts <https://docs.aws.amazon.com/eventbridge/latest/userguide/pipes-concepts.html>`__ in the *Amazon EventBridge User Guide*.