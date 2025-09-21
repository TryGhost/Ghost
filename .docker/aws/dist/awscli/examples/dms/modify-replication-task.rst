**To modify a replication task**

The following ``modify-replication-task`` example changes the table mappings for a task. ::

    aws dms modify-replication-task \
        --replication-task-arn "arn:aws:dms:us-east-1:123456789012:task:K55IUCGBASJS5VHZJIINA45FII" \
        --table-mappings file://table-mappings.json


Contents of ``table-mappings.json``::

    {
        "rules": [
            {
                "rule-type": "selection",
                "rule-id": "1",
                "rule-name": "1",
                "object-locator": {
                    "schema-name": "prodrep",
                    "table-name": "ACCT_%"
                },
                "rule-action": "include",
                "filters": []
            }
        ]
    }

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
            "Status": "modifying",
            "StopReason": "Stop Reason FULL_LOAD_ONLY_FINISHED",
            "ReplicationTaskCreationDate": 1590524772.505,
            "ReplicationTaskStartDate": 1590789424.653,
            "ReplicationTaskArn": "arn:aws:dms:us-east-1:123456789012:task:K55IUCGBASJS5VHZJIINA45FII"
        }
    }

For more information, see `Working with AWS DMS Tasks <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.html>`__ in the *AWS Database Migration Service User Guide*.
