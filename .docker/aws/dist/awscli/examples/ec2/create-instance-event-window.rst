**Example 1: To create an event window with a time range**

The following ``create-instance-event-window`` example creates an event window with a time range. You can't also specify the ``cron-expression`` parameter. ::

    aws ec2 create-instance-event-window \
        --region us-east-1 \
        --time-range StartWeekDay=monday,StartHour=2,EndWeekDay=wednesday,EndHour=8 \
        --tag-specifications "ResourceType=instance-event-window,Tags=[{Key=K1,Value=V1}]" \
        --name myEventWindowName 

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

**Example 2: To create an event window with a cron expression**

The following ``create-instance-event-window`` example creates an event window with a cron expression. You can't also specify the ``time-range`` parameter. ::

    aws ec2 create-instance-event-window \
        --region us-east-1 \
        --cron-expression "* 21-23 * * 2,3" \
        --tag-specifications "ResourceType=instance-event-window,Tags=[{Key=K1,Value=V1}]" \
        --name myEventWindowName

Output::

    {
        "InstanceEventWindow": {
            "InstanceEventWindowId": "iew-0abcdef1234567890",
            "Name": "myEventWindowName",
            "CronExpression": "* 21-23 * * 2,3",
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