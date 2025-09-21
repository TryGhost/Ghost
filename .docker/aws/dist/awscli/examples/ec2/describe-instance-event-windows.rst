**Example 1: To describe all event windows**

The following ``describe-instance-event-windows`` example describes all event windows in the specified Region. ::

    aws ec2 describe-instance-event-windows \
        --region us-east-1

Output::

    {
        "InstanceEventWindows": [
            {
                "InstanceEventWindowId": "iew-0abcdef1234567890",
                "Name": "myEventWindowName",
                "CronExpression": "* 21-23 * * 2,3",
                "AssociationTarget": {
                    "InstanceIds": [
                        "i-1234567890abcdef0",
                        "i-0598c7d356eba48d7"
                    ],
                    "Tags": [],
                    "DedicatedHostIds": []
                },
                "State": "active",
                "Tags": []
            }
            
            ...
            
        ],
        "NextToken": "9d624e0c-388b-4862-a31e-a85c64fc1d4a"
    }

**Example 2: To describe a specific event window**

The following ``describe-instance-event-windows`` example describes a specific event by using the ``instance-event-window`` parameter to describe a specific event window. ::

    aws ec2 describe-instance-event-windows \
        --region us-east-1 \
        --instance-event-window-ids iew-0abcdef1234567890

Output::

    {
        "InstanceEventWindows": [
            {
                "InstanceEventWindowId": "iew-0abcdef1234567890",
                "Name": "myEventWindowName",
                "CronExpression": "* 21-23 * * 2,3",
                "AssociationTarget": {
                    "InstanceIds": [
                        "i-1234567890abcdef0",
                        "i-0598c7d356eba48d7"
                    ],
                    "Tags": [],
                    "DedicatedHostIds": []
                },
                "State": "active",
                "Tags": []
            }
    }

**Example 3: To describe event windows that match one or more filters**

The following ``describe-instance-event-windows`` example describes event windows that match one or more filters using the ``filter`` parameter. The ``instance-id`` filter is used to describe all of the event windows that are associated with the specified instance. When a filter is used, it performs a direct match. However, the ``instance-id`` filter is different. If there is no direct match to the instance ID, then it falls back to indirect associations with the event window, such as the tags of the instance or Dedicated Host ID (if the instance is a Dedicated Host). ::

    aws ec2 describe-instance-event-windows \
        --region us-east-1 \
        --filters Name=instance-id,Values=i-1234567890abcdef0 \
        --max-results 100 \
        --next-token <next-token-value>

Output::

    {
        "InstanceEventWindows": [
            {
                "InstanceEventWindowId": "iew-0dbc0adb66f235982",
                "TimeRanges": [
                    {
                        "StartWeekDay": "sunday",
                        "StartHour": 2,
                        "EndWeekDay": "sunday",
                        "EndHour": 8
                    }
                ],
                "Name": "myEventWindowName",
                "AssociationTarget": {
                    "InstanceIds": [],
                    "Tags": [],
                    "DedicatedHostIds": [
                        "h-0140d9a7ecbd102dd"
                    ]
                },
                "State": "active",
                "Tags": []
            }
        ]
    }

In the example output, the instance is on a Dedicated Host, which is associated with the event window.

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the *Amazon EC2 User Guide*.
