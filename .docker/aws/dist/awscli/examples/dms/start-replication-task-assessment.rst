**To start a task assessment**

The following ``start-replication-task-assessment`` example starts a replication task assessment. ::

    aws dms start-replication-task-assessment \
        --replication-task-arn arn:aws:dms:us-east-1:123456789012:task:K55IUCGBASJS5VHZJIINA45FII  

Output::

    {
        "ReplicationTask": {
            "ReplicationTaskIdentifier": "moveit2",
            "SourceEndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA",
            "TargetEndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:EOM4SFKCZEYHZBFGAGZT3QEC5U",
            "ReplicationInstanceArn": "arn:aws:dms:us-east-1:123456789012:rep:T3OM7OUB5NM2LCVZF7JPGJRNUE",
            "MigrationType": "full-load",
            "TableMappings": ...output omitted...,
            "ReplicationTaskSettings": ...output omitted...,
            "Status": "testing",
            "StopReason": "Stop Reason FULL_LOAD_ONLY_FINISHED",
            "ReplicationTaskCreationDate": 1590524772.505,
            "ReplicationTaskStartDate": 1590789988.677,
            "ReplicationTaskArn": "arn:aws:dms:us-east-1:123456789012:task:K55IUCGBASJS5VHZJIINA45FII"
        }
    }

For more information, see `Creating a Task Assessment Report <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.AssessmentReport.html>`__ in the *AWS Database Migration Service User Guide*.

