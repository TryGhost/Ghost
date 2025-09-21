**Example 1: To create a lifecycle hook**

This example creates a lifecycle hook that will invoke on any newly launched instances, with a timeout of 4800 seconds. This is useful for keeping the instances in a wait state until the user data scripts have finished, or for invoking an AWS Lambda function using EventBridge. ::

    aws autoscaling put-lifecycle-hook \
        --auto-scaling-group-name my-asg \
        --lifecycle-hook-name my-launch-hook \
        --lifecycle-transition autoscaling:EC2_INSTANCE_LAUNCHING \
        --heartbeat-timeout 4800

This command produces no output.  If a lifecycle hook with the same name already exists, it will be overwritten by the new lifecycle hook.

For more information, see `Amazon EC2 Auto Scaling lifecycle hooks <https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 2: To send an Amazon SNS email message to notify you of instance state transitions**

This example creates a lifecycle hook with the Amazon SNS topic and IAM role to use to receive notification at instance launch. ::

    aws autoscaling put-lifecycle-hook \
        --auto-scaling-group-name my-asg \
        --lifecycle-hook-name my-launch-hook \
        --lifecycle-transition autoscaling:EC2_INSTANCE_LAUNCHING \
        --notification-target-arn arn:aws:sns:us-west-2:123456789012:my-sns-topic \
        --role-arn arn:aws:iam::123456789012:role/my-auto-scaling-role

This command produces no output.

For more information, see `Amazon EC2 Auto Scaling lifecycle hooks <https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 3: To publish a message to an Amazon SQS queue**

This example creates a lifecycle hook that publishes a message with metadata to the specified Amazon SQS queue. ::

    aws autoscaling put-lifecycle-hook \
        --auto-scaling-group-name my-asg \
        --lifecycle-hook-name my-launch-hook \
        --lifecycle-transition autoscaling:EC2_INSTANCE_LAUNCHING \
        --notification-target-arn arn:aws:sqs:us-west-2:123456789012:my-sqs-queue \
        --role-arn arn:aws:iam::123456789012:role/my-notification-role \
        --notification-metadata "SQS message metadata"

This command produces no output.

For more information, see `Amazon EC2 Auto Scaling lifecycle hooks <https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.