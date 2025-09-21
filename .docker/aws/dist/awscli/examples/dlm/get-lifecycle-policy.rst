**To describe a lifecycle policy**

The following ``get-lifecycle-policy`` example displays details for the specified lifecycle policy. ::

    aws dlm get-lifecycle-policy \
        --policy-id policy-0123456789abcdef0

Output::

    {
        "Policy": {
            "PolicyId": "policy-0123456789abcdef0",
            "Description": "My policy",
            "State": "ENABLED",
            "ExecutionRoleArn": "arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole",
            "DateCreated": "2019-08-08T17:45:42Z",
            "DateModified": "2019-08-08T17:45:42Z",
            "PolicyDetails": {
                "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
                "ResourceTypes": [
                    "VOLUME"
                ],
                "TargetTags": [
                  {
                      "Key": "costCenter",
                      "Value": "115"
                  }
                ],
                "Schedules": [
                  {
                      "Name": "DailySnapshots",
                      "CopyTags": true,
                      "TagsToAdd": [
                        {
                            "Key": "type",
                            "Value": "myDailySnapshot"
                        }
                      ],
                      "CreateRule": {
                        "Interval": 24,
                        "IntervalUnit": "HOURS",
                        "Times": [
                            "03:00"
                        ]
                      },
                      "RetainRule": {
                        "Count": 5
                      }
                  }
                ]
            }
        }
    }
