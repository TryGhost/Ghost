**To stop an existing pipe**

The following ``stop-pipe`` example stops a Pipe named ``Demo_Pipe`` in the specified account. ::

    aws pipes stop-pipe \
        --name Demo_Pipe

Output::

    {
        "Arn": "arn:aws:pipes:us-east-1:123456789012:pipe/Demo_Pipe",
        "Name": "Demo_Pipe",
        "DesiredState": "STOPPED",
        "CurrentState": "STOPPING",
        "CreationTime": "2024-10-08T09:29:10-05:00",
        "LastModifiedTime": "2024-10-08T09:29:49-05:00"
    }

For more information, see `Starting or stopping an Amazon EventBridge pipe <https://docs.aws.amazon.com/eventbridge/latest/userguide/pipes-start-stop.html>`__ in the *Amazon EventBridge User Guide*.