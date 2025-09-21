**To add a notification**

This example adds the specified notification to the specified Auto Scaling group. ::

    aws autoscaling put-notification-configuration \
        --auto-scaling-group-name my-asg \
        --topic-arn arn:aws:sns:us-west-2:123456789012:my-sns-topic \
        --notification-type autoscaling:TEST_NOTIFICATION

This command produces no output.

For more information, see `Getting Amazon SNS notifications when your Auto Scaling group scales <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ASGettingNotifications.html#as-configure-asg-for-sns>`__ in the *Amazon EC2 Auto Scaling User Guide*.
