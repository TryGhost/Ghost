**To describe a replication task** 

The following ``describe-replication-tasks`` example describes current replication tasks. ::

    aws dms describe-replication-tasks

Output::

    {
        "ReplicationTasks": [
            {
                "ReplicationTaskIdentifier": "moveit2",
                "SourceEndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA",
                "TargetEndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:EOM4SFKCZEYHZBFGAGZT3QEC5U",
                "ReplicationInstanceArn": "arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE",
                "MigrationType": "full-load",
                "TableMappings": ...output omitted... ,
                "ReplicationTaskSettings": ...output omitted... ,
                "Status": "stopped",
                "StopReason": "Stop Reason FULL_LOAD_ONLY_FINISHED",
                "ReplicationTaskCreationDate": 1590524772.505,
                "ReplicationTaskStartDate": 1590619805.212,
                "ReplicationTaskArn": "arn:aws:dms:us-east-1:123456789012:task:K55IUCGBASJS5VHZJIINA45FII",
                "ReplicationTaskStats": {
                    "FullLoadProgressPercent": 100,
                    "ElapsedTimeMillis": 0,
                    "TablesLoaded": 0,
                    "TablesLoading": 0,
                    "TablesQueued": 0,
                    "TablesErrored": 0,
                    "FreshStartDate": 1590619811.528,
                    "StartDate": 1590619811.528,
                    "StopDate": 1590619842.068
                }
            }
        ]
    }

For more information, see `Working with AWS DMS Tasks <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.html>`__ in the *AWS Database Migration Service User Guide*.
