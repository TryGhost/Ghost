**To create a replication task** 

The following ``create-replication-task`` example creates a replication task. ::

    aws dms create-replication-task \
        --replication-task-identifier movedata \
        --source-endpoint-arn arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA \
        --target-endpoint-arn arn:aws:dms:us-east-1:123456789012:endpoint:EOM4SFKCZEYHZBFGAGZT3QEC5U \
        --replication-instance-arn $RI_ARN \
        --migration-type full-load \
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
                    "table-name": "%"
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
            "TableMappings": ...output omitted... ,
            "ReplicationTaskSettings": ...output omitted... ,
            "Status": "creating",
            "ReplicationTaskCreationDate": 1590524772.505,
            "ReplicationTaskArn": "arn:aws:dms:us-east-1:123456789012:task:K55IUCGBASJS5VHZJIINA45FII"
        }
    }

For more information, see `Working with AWS DMS Tasks <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.html>`__ in the *AWS Database Migration Service User Guide*.
