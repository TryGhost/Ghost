**To delete an existing pipe**

The following ``delete-pipe`` example deletes a Pipe named ``Demo_Pipe`` in the specified account. ::

    aws pipes delete-pipe \
        --name Demo_Pipe

Output::

    {
        "Arn": "arn:aws:pipes:us-east-1:123456789012:pipe/Demo_Pipe",
        "Name": "Demo_Pipe",
        "DesiredState": "STOPPED",
        "CurrentState": "DELETING",
        "CreationTime": "2024-10-08T09:29:10-05:00",
        "LastModifiedTime": "2024-10-08T11:57:22-05:00"
    }

For more information, see `Amazon EventBridge Pipes concepts <https://docs.aws.amazon.com/eventbridge/latest/userguide/pipes-concepts.html>`__ in the *Amazon EventBridge User Guide*.