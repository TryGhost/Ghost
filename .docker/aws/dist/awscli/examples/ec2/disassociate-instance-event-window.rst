**Example 1: To disassociate one or more instances from an event window**

The following ``disassociate-instance-event-window`` example disassociates one or more instances from an event window. Specify the ``instance-event-window-id`` parameter to specify the event window. To disassociate instances, specify the ``association-target`` parameter, and for the parameter values, specify one or more instance IDs. ::

    aws ec2 disassociate-instance-event-window \
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
                "InstanceIds": [],
                "Tags": [],
                "DedicatedHostIds": []
            },
            "State": "creating"
        }
    }

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the Scheduled Events section of the *Amazon EC2 User Guide*.

**Example 2: To disassociate instance tags from an event window**

The following ``disassociate-instance-event-window`` example disassociates instance tags from an event window. Specify the ``instance-event-window-id`` parameter to specify the event window. To disassociate instance tags, specify the ``association-target`` parameter, and for the parameter values, specify one or more tags. ::

    aws ec2 disassociate-instance-event-window \
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
                "Tags": [],
                "DedicatedHostIds": []
            },
            "State": "creating"
        }
    }

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the Scheduled Events section of the *Amazon EC2 User Guide*.

**Example 3: To disassociate a Dedicated Host from an event window**

The following ``disassociate-instance-event-window`` example disassociates a Dedicated Host from an event window. Specify the ``instance-event-window-id`` parameter to specify the event window. To disassociate a Dedicated Host, specify the ``association-target`` parameter, and for the parameter values, specify one or more Dedicated Host IDs. ::

    aws ec2 disassociate-instance-event-window \
        --region us-east-1 \
        --instance-event-window-id iew-0abcdef1234567890 \
        --association-target DedicatedHostIds=h-029fa35a02b99801d

Output::

    {
        "InstanceEventWindow": {
            "InstanceEventWindowId": "iew-0abcdef1234567890",
            "Name": "myEventWindowName",
            "CronExpression": "* 21-23 * * 2,3",
            "AssociationTarget": {
                "InstanceIds": [],
                "Tags": [],
                "DedicatedHostIds": []
            },
            "State": "creating"
        }
    }

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the Scheduled Events section of the *Amazon EC2 User Guide*.