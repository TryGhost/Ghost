**To start an existing pipe**

The following ``start-pipe`` example starts a Pipe named ``Demo_Pipe`` in the specified account. ::

    aws pipes start-pipe \
        --name Demo_Pipe

Output::

    {
        "Arn": "arn:aws:pipes:us-east-1:123456789012:pipe/Demo_Pipe",
        "Name": "Demo_Pipe",
        "DesiredState": "RUNNING",
        "CurrentState": "STARTING",
        "CreationTime": "2024-10-08T09:29:10-05:00",
        "LastModifiedTime": "2024-10-08T10:17:24-05:00"
    }

For more information, see `Starting or stopping an Amazon EventBridge pipe <https://docs.aws.amazon.com/eventbridge/latest/userguide/pipes-start-stop.html>`__ in the *Amazon EventBridge User Guide*.