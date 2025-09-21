**Example 1: To modify the time range of an event window**

The following ``modify-instance-event-window`` example modifies the time range of an event window. Specify the ``time-range`` parameter to modify the time range. You can't also specify the ``cron-expression`` parameter. ::

    aws ec2 modify-instance-event-window \
        --region us-east-1 \
        --instance-event-window-id iew-0abcdef1234567890
        --time-range StartWeekDay=monday,StartHour=2,EndWeekDay=wednesday,EndHour=8 

Output::

    {
        "InstanceEventWindow": {
            "InstanceEventWindowId": "iew-0abcdef1234567890",
            "TimeRanges": [
                {
                    "StartWeekDay": "monday",
                    "StartHour": 2,
                    "EndWeekDay": "wednesday",
                    "EndHour": 8
                }
            ],
            "Name": "myEventWindowName",
            "AssociationTarget": {
                "InstanceIds": [
                    "i-0abcdef1234567890",
                    "i-0be35f9acb8ba01f0"
                ],
                "Tags": [],
                "DedicatedHostIds": []
            },
            "State": "creating",
            "Tags": [
                {
                    "Key": "K1",
                    "Value": "V1"
                }
            ]
        }
    }

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the Scheduled Events section of the *Amazon EC2 User Guide*.

**Example 2: To modify a set of time ranges for an event window**

The following ``modify-instance-event-window`` example modifies the time range of an event window. Specify the ``time-range`` parameter to modify the time range. You can't also specify the ``cron-expression`` parameter. ::

    aws ec2 modify-instance-event-window \
        --region us-east-1 \
        --instance-event-window-id iew-0abcdef1234567890 \
        --time-range '[{"StartWeekDay": "monday", "StartHour": 2, "EndWeekDay": "wednesday", "EndHour": 8},
            {"StartWeekDay": "thursday", "StartHour": 2, "EndWeekDay": "friday", "EndHour": 8}]'

Output::

    {
        "InstanceEventWindow": {
            "InstanceEventWindowId": "iew-0abcdef1234567890",
            "TimeRanges": [
                {
                    "StartWeekDay": "monday",
                    "StartHour": 2,
                    "EndWeekDay": "wednesday",
                    "EndHour": 8
                },
                {
                    "StartWeekDay": "thursday",
                    "StartHour": 2,
                    "EndWeekDay": "friday",
                    "EndHour": 8
                }
            ],
            "Name": "myEventWindowName",
            "AssociationTarget": {
                "InstanceIds": [
                    "i-0abcdef1234567890",
                    "i-0be35f9acb8ba01f0"
                ],
                "Tags": [],
                "DedicatedHostIds": []
            },
            "State": "creating",
            "Tags": [
                {
                    "Key": "K1",
                    "Value": "V1"
                }
            ]
        }
    }

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the Scheduled Events section of the *Amazon EC2 User Guide*.

**Example 3: To modify the cron expression of an event window**

The following ``modify-instance-event-window`` example modifies the cron expression of an event window. Specify the ``cron-expression`` parameter to modify the cron expression. You can't also specify the ``time-range`` parameter. ::

    aws ec2 modify-instance-event-window \
        --region us-east-1 \
        --instance-event-window-id iew-0abcdef1234567890 \
        --cron-expression "* 21-23 * * 2,3"

Output::

    {
        "InstanceEventWindow": {
            "InstanceEventWindowId": "iew-0abcdef1234567890",
            "Name": "myEventWindowName",
            "CronExpression": "* 21-23 * * 2,3",
            "AssociationTarget": {
                "InstanceIds": [
                    "i-0abcdef1234567890",
                    "i-0be35f9acb8ba01f0"
                ],
                "Tags": [],
                "DedicatedHostIds": []
            },
            "State": "creating",
            "Tags": [
                {
                    "Key": "K1",
                    "Value": "V1"
                }
            ]
        }
    }

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the Scheduled Events section of the *Amazon EC2 User Guide*.