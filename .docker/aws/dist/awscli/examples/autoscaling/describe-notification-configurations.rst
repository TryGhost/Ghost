**Example 1: To describe the notification configurations of a specified group**

This example describes the notification configurations for the specified Auto Scaling group. ::

    aws autoscaling describe-notification-configurations \
        --auto-scaling-group-name my-asg

Output::

    {
        "NotificationConfigurations": [
            {
                "AutoScalingGroupName": "my-asg",
                "NotificationType": "autoscaling:TEST_NOTIFICATION",
                "TopicARN": "arn:aws:sns:us-west-2:123456789012:my-sns-topic-2"
            },
            {
                "AutoScalingGroupName": "my-asg",
                "NotificationType": "autoscaling:TEST_NOTIFICATION",
                "TopicARN": "arn:aws:sns:us-west-2:123456789012:my-sns-topic"
            }
        ]
    }

For more information, see `Getting Amazon SNS notifications when your Auto Scaling group scales <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ASGettingNotifications.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 1: To describe a specified number of notification configurations**

To return a specific number of notification configurations, use the ``max-items`` parameter. ::

    aws autoscaling describe-notification-configurations \
        --auto-scaling-group-name my-auto-scaling-group \
        --max-items 1

Output::

    {
        "NotificationConfigurations": [
            {
                "AutoScalingGroupName": "my-asg",
                "NotificationType": "autoscaling:TEST_NOTIFICATION",
                "TopicARN": "arn:aws:sns:us-west-2:123456789012:my-sns-topic-2"
            },
            {
                "AutoScalingGroupName": "my-asg",
                "NotificationType": "autoscaling:TEST_NOTIFICATION",
                "TopicARN": "arn:aws:sns:us-west-2:123456789012:my-sns-topic"
            }
        ]
    }

If the output includes a ``NextToken`` field, there are more notification configurations. To get the additional notification configurations, use the value of this field with the ``starting-token`` parameter in a subsequent call as follows. ::

    aws autoscaling describe-notification-configurations \
        --auto-scaling-group-name my-asg \
        --starting-token Z3M3LMPEXAMPLE

For more information, see `Getting Amazon SNS notifications when your Auto Scaling group scales <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ASGettingNotifications.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.