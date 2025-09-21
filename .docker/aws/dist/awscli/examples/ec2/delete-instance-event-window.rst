**Example 1: To delete an event window**

The following ``delete-instance-event-window`` example deletes an event window. ::

    aws ec2 delete-instance-event-window \
        --region us-east-1 \
        --instance-event-window-id iew-0abcdef1234567890

Output::

    {
        "InstanceEventWindowState": {
            "InstanceEventWindowId": "iew-0abcdef1234567890",
            "State": "deleting"
        }
    }

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the Scheduled Events section of the *Amazon EC2 User Guide*.

**Example 2: To force delete an event window**

The following ``delete-instance-event-window`` example force deletes an event window if the event window is currently associated with targets. ::

    aws ec2 delete-instance-event-window \
        --region us-east-1 \
        --instance-event-window-id iew-0abcdef1234567890 \
        --force-delete

Output::

    {
        "InstanceEventWindowState": {
            "InstanceEventWindowId": "iew-0abcdef1234567890",
            "State": "deleting"
        }
    }

For event window constraints, see `Considerations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/event-windows.html#event-windows-considerations>`__ in the Scheduled Events section of the *Amazon EC2 User Guide*.