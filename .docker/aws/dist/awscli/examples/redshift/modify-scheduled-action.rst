**To modify scheduled action**

The following ``modify-scheduled-action`` example adds a description to the specified existing scheduled action. ::

    aws redshift modify-scheduled-action \
        --scheduled-action-name myscheduledaction \
        --scheduled-action-description "My scheduled action"

Output::

    {
        "ScheduledActionName": "myscheduledaction",
        "TargetAction": {
            "ResizeCluster": {
                "ClusterIdentifier": "mycluster",
                "NumberOfNodes": 2,
                "Classic": false
            }
        },
        "Schedule": "at(2019-12-25T00:00:00)",
        "IamRole": "arn:aws:iam::123456789012:role/myRedshiftRole",
        "ScheduledActionDescription": "My scheduled action",
        "State": "ACTIVE",
        "NextInvocations": [
            "2019-12-25T00:00:00Z"
        ]
    }
