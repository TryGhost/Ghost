**To return a list of events**

The following `describe-events`` returns a list of events. ::

    aws memorydb describe-events

Output::

    {
        "Events": [
            {
                "SourceName": "my-cluster",
                "SourceType": "cluster",
                "Message": "Increase replica count started for replication group my-cluster on 2022-07-22T14:09:01.440Z",
                "Date": "2022-07-22T07:09:01.443000-07:00"
            },
            {
                "SourceName": "my-user",
                "SourceType": "user",
                "Message": "Create user my-user operation completed.",
                "Date": "2022-07-22T07:00:02.975000-07:00"
            }
        ]
    }

For more information, see `Monitoring events <https://docs.aws.amazon.com/memorydb/latest/devguide/monitoring-events.html>`__ in the *MemoryDB User Guide*.
