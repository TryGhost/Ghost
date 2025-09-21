**To describe scheduled actions**

The following ``describe-scheduled-actions`` example displays details for any currently scheduled actions. ::

    aws redshift describe-scheduled-actions

Output::

    {
        "ScheduledActions": [
            {
                "ScheduledActionName": "resizecluster",
                "TargetAction": {
                    "ResizeCluster": {
                        "ClusterIdentifier": "mycluster",
                        "NumberOfNodes": 4,
                        "Classic": false
                    }
                },
                "Schedule": "at(2019-12-10T00:07:00)",
                "IamRole": "arn:aws:iam::123456789012:role/myRedshiftRole",
                "State": "ACTIVE",
                "NextInvocations": [
                    "2019-12-10T00:07:00Z"
                ]
            }
        ]
    }
