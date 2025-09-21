**To list DMS events**

The following ``describe-events`` example lists the events that originated from a replication instance. ::

    aws dms describe-events \
        --source-type "replication-instance"

Output::

    {
        "Events": [
            {
                "SourceIdentifier": "my-repl-instance",
                "SourceType": "replication-instance",
                "Message": "Replication application shutdown",
                "EventCategories": [],
                "Date": 1590771645.776
            }
        ]
    }

For more information, see `Working with Events and Notifications <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Events.html>`__ in the *AWS Database Migration Service User Guide*.
