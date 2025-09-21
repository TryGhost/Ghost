**Example 1: To associate one or more instances with an event window**

The following ``associate-instance-event-window`` example associates one or more instances with an event window. ::

    aws ec2 associate-instance-event-window \
        --region us-east-1 \
        --instance-event-window-id iew-0abcdef1234567890 \
        --association-target "InstanceIds=i-1234567890abcdef0,i-0598c7d356eba48d7"

Output::

    {
        "InstanceEventWindow": {
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
            "State": "creating"
        }
    }

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the Scheduled Events section of the *Amazon EC2 User Guide*.

**Example 2: To associate instance tags with an event window**

The following ``associate-instance-event-window`` example associates instance tags with an event window. Enter an ``instance-event-window-id`` parameter to specify the event window. To associate instance tags, specify the ``association-target`` parameter, and for the parameter value, specify one or more tags. ::

    aws ec2 associate-instance-event-window \
        --region us-east-1 \
        --instance-event-window-id iew-0abcdef1234567890 \
        --association-target "InstanceTags=[{Key=k2,Value=v2},{Key=k1,Value=v1}]"

Output::

    {
        "InstanceEventWindow": {
            "InstanceEventWindowId": "iew-0abcdef1234567890",
            "Name": "myEventWindowName",
            "CronExpression": "* 21-23 * * 2,3",
            "AssociationTarget": {
                "InstanceIds": [],
                "Tags": [
                    {
                        "Key": "k2",
                        "Value": "v2"
                    },
                    {
                        "Key": "k1",
                        "Value": "v1"
                    }
                ],
                "DedicatedHostIds": []
            },
            "State": "creating"
        }
    }

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the Scheduled Events section of the *Amazon EC2 User Guide*.

**Example 3: To associate a Dedicated Host with an event window**

The following ``associate-instance-event-window`` example associates a Dedicated Host with an event window. Enter an ``instance-event-window-id`` parameter to specify the event window. To associate a Dedicated Host, specify the ``--association-target`` parameter, and for the parameter values, specify one of more Dedicated Host IDs. ::

    aws ec2 associate-instance-event-window \
        --region us-east-1 \
        --instance-event-window-id iew-0abcdef1234567890 \
        --association-target "DedicatedHostIds=h-029fa35a02b99801d"

Output::

    {
        "InstanceEventWindow": {
            "InstanceEventWindowId": "iew-0abcdef1234567890",
            "Name": "myEventWindowName",
            "CronExpression": "* 21-23 * * 2,3",
            "AssociationTarget": {
                "InstanceIds": [],
                "Tags": [],
                "DedicatedHostIds": [
                    "h-029fa35a02b99801d"
                ]
            },
            "State": "creating"
        }
    }

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the Scheduled Events section of the *Amazon EC2 User Guide*.