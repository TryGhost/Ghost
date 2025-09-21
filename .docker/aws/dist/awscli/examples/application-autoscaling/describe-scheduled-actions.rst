**To describe scheduled actions**

The following ``describe-scheduled-actions`` example displays details for the scheduled actions for the specified service namespace::

    aws application-autoscaling describe-scheduled-actions \
        --service-namespace dynamodb

Output::

    {
        "ScheduledActions": [
            {
                "ScalableDimension": "dynamodb:table:WriteCapacityUnits",
                "Schedule": "at(2019-05-20T18:35:00)",
                "ResourceId": "table/my-table",
                "CreationTime": 1561571888.361,
                "ScheduledActionARN": "arn:aws:autoscaling:us-west-2:123456789012:scheduledAction:2d36aa3b-cdf9-4565-b290-81db519b227d:resource/dynamodb/table/my-table:scheduledActionName/my-first-scheduled-action",
                "ScalableTargetAction": {
                    "MinCapacity": 15,
                    "MaxCapacity": 20
                },
                "ScheduledActionName": "my-first-scheduled-action",
                "ServiceNamespace": "dynamodb"
            },
            {
                "ScalableDimension": "dynamodb:table:WriteCapacityUnits",
                "Schedule": "at(2019-05-20T18:40:00)",
                "ResourceId": "table/my-table",
                "CreationTime": 1561571946.021,
                "ScheduledActionARN": "arn:aws:autoscaling:us-west-2:123456789012:scheduledAction:2d36aa3b-cdf9-4565-b290-81db519b227d:resource/dynamodb/table/my-table:scheduledActionName/my-second-scheduled-action",
                "ScalableTargetAction": {
                    "MinCapacity": 5,
                    "MaxCapacity": 10
                },
                "ScheduledActionName": "my-second-scheduled-action",
                "ServiceNamespace": "dynamodb"
            }
        ]
    }

For more information, see `Scheduled Scaling <https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-scheduled-scaling.html>`__ in the *Application Auto Scaling User Guide*.
