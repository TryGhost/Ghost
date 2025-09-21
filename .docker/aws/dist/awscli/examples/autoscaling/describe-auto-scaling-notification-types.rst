**To describe the available notification types**

This example describes the available notification types. ::

    aws autoscaling describe-auto-scaling-notification-types

Output::

    {
        "AutoScalingNotificationTypes": [
            "autoscaling:EC2_INSTANCE_LAUNCH",
            "autoscaling:EC2_INSTANCE_LAUNCH_ERROR",
            "autoscaling:EC2_INSTANCE_TERMINATE",
            "autoscaling:EC2_INSTANCE_TERMINATE_ERROR",
            "autoscaling:TEST_NOTIFICATION"
        ]
    }

For more information, see `Getting Amazon SNS notifications when your Auto Scaling group scales <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ASGettingNotifications.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.
