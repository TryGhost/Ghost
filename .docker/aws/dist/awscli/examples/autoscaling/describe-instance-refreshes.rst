**To describe instance refreshes**

The following ``describe-instance-refreshes`` example returns a description of all instance refresh requests for the specified Auto Scaling group, including the status message and (if available) the status reason. ::

    aws autoscaling describe-instance-refreshes \
        --auto-scaling-group-name my-asg 

Output::

    {
        "InstanceRefreshes": [
            {
                "InstanceRefreshId": "08b91cf7-8fa6-48af-b6a6-d227f40f1b9b",
                "AutoScalingGroupName": "my-asg",
                "Status": "InProgress",
                "StatusReason": "Waiting for instances to warm up before continuing. For example: 0e69cc3f05f825f4f is warming up.",
                "EndTime": "2023-03-23T16:42:55Z",
                "PercentageComplete": 0,
                "InstancesToUpdate": 0,
        "Preferences": {
                    "MinHealthyPercentage": 100,
                    "InstanceWarmup": 300,
                    "CheckpointPercentages": [
                        50
                    ],
                    "CheckpointDelay": 3600,
                    "SkipMatching": false,
                    "AutoRollback": true,
                    "ScaleInProtectedInstances": "Ignore",
                    "StandbyInstances": "Ignore"
                }
            },
            {
                "InstanceRefreshId": "dd7728d0-5bc4-4575-96a3-1b2c52bf8bb1",
                "AutoScalingGroupName": "my-asg",
                "Status": "Successful",
                "EndTime": "2022-06-02T16:53:37Z",
                "PercentageComplete": 100,
                "InstancesToUpdate": 0,
        "Preferences": {
                    "MinHealthyPercentage": 90,
                    "InstanceWarmup": 300,
                    "SkipMatching": true,
                    "AutoRollback": true,
                    "ScaleInProtectedInstances": "Ignore",
                    "StandbyInstances": "Ignore"
                }
            }
        ]
    }

For more information, see `Check the status of an instance refresh <https://docs.aws.amazon.com/en_us/autoscaling/ec2/userguide/check-status-instance-refresh.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.