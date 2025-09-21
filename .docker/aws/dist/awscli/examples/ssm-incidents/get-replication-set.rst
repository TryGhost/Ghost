**To get the replication set**

The following ``get-replication-set`` example gets the details of the replication set Incident Manager uses to replicate and encrypt data in your Amazon Web Services account. ::

    aws ssm-incidents get-replication-set \
        --arn "arn:aws:ssm-incidents::111122223333:replication-set/c4bcb603-4bf9-bb3f-413c-08df53673b57"

Output::

    {
        "replicationSet": {
            "createdBy": "arn:aws:sts::111122223333:assumed-role/Admin/username",
            "createdTime": "2021-05-14T17:57:22.010000+00:00",
            "deletionProtected": false,
            "lastModifiedBy": "arn:aws:sts::111122223333:assumed-role/Admin/username",
            "lastModifiedTime": "2021-05-14T17:57:22.010000+00:00",
            "regionMap": {
                "us-east-1": {
                    "sseKmsKeyId": "DefaultKey",
                    "status": "ACTIVE"
                },
                "us-east-2": {
                    "sseKmsKeyId": "DefaultKey",
                    "status": "ACTIVE",
                    "statusMessage": "Tagging inaccessible"
                }
            },
            "status": "ACTIVE"
        }
    }

For more information, see `Using the Incident Manager replication set <https://docs.aws.amazon.com/incident-manager/latest/userguide/replication.html>`__ in the *Incident Manager User Guide*.