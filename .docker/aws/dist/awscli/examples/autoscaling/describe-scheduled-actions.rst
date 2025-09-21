**Example 1: To describe all scheduled actions**

This example describes all your scheduled actions. ::

    aws autoscaling describe-scheduled-actions

Output::

    {
        "ScheduledUpdateGroupActions": [
            {
                "AutoScalingGroupName": "my-asg",
                "ScheduledActionName": "my-recurring-action",
                "Recurrence": "30 0 1 1,6,12 *",
                "ScheduledActionARN": "arn:aws:autoscaling:us-west-2:123456789012:scheduledUpdateGroupAction:8e86b655-b2e6-4410-8f29-b4f094d6871c:autoScalingGroupName/my-asg:scheduledActionName/my-recurring-action",
                "StartTime": "2023-12-01T04:00:00Z",
                "Time": "2023-12-01T04:00:00Z",
                "MinSize": 1,
                "MaxSize": 6,
                "DesiredCapacity": 4,
                "TimeZone": "America/New_York"
            }
        ]
    }

For more information, see `Scheduled scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 2: To describe scheduled actions for the specified group**

To describe the scheduled actions for a specific Auto Scaling group, use the ``--auto-scaling-group-name`` option. ::

    aws autoscaling describe-scheduled-actions \
        --auto-scaling-group-name my-asg

Output::

    {
        "ScheduledUpdateGroupActions": [
            {
                "AutoScalingGroupName": "my-asg",
                "ScheduledActionName": "my-recurring-action",
                "Recurrence": "30 0 1 1,6,12 *",
                "ScheduledActionARN": "arn:aws:autoscaling:us-west-2:123456789012:scheduledUpdateGroupAction:8e86b655-b2e6-4410-8f29-b4f094d6871c:autoScalingGroupName/my-asg:scheduledActionName/my-recurring-action",
                "StartTime": "2023-12-01T04:00:00Z",
                "Time": "2023-12-01T04:00:00Z",
                "MinSize": 1,
                "MaxSize": 6,
                "DesiredCapacity": 4,
                "TimeZone": "America/New_York"
            }
        ]
    }

For more information, see `Scheduled scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 3: To describe the specified scheduled action**

To describe a specific scheduled action, use the ``--scheduled-action-names`` option. ::

    aws autoscaling describe-scheduled-actions \
        --scheduled-action-names my-recurring-action

Output::

    {
        "ScheduledUpdateGroupActions": [
            {
                "AutoScalingGroupName": "my-asg",
                "ScheduledActionName": "my-recurring-action",
                "Recurrence": "30 0 1 1,6,12 *",
                "ScheduledActionARN": "arn:aws:autoscaling:us-west-2:123456789012:scheduledUpdateGroupAction:8e86b655-b2e6-4410-8f29-b4f094d6871c:autoScalingGroupName/my-asg:scheduledActionName/my-recurring-action",
                "StartTime": "2023-12-01T04:00:00Z",
                "Time": "2023-12-01T04:00:00Z",
                "MinSize": 1,
                "MaxSize": 6,
                "DesiredCapacity": 4,
                "TimeZone": "America/New_York"
            }
        ]
    }

For more information, see `Scheduled scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 4: To describe scheduled actions with a specified start time**

To describe the scheduled actions that start at a specific time, use the ``--start-time`` option. ::

    aws autoscaling describe-scheduled-actions \
        --start-time "2023-12-01T04:00:00Z"

Output::

    {
        "ScheduledUpdateGroupActions": [
            {
                "AutoScalingGroupName": "my-asg",
                "ScheduledActionName": "my-recurring-action",
                "Recurrence": "30 0 1 1,6,12 *",
                "ScheduledActionARN": "arn:aws:autoscaling:us-west-2:123456789012:scheduledUpdateGroupAction:8e86b655-b2e6-4410-8f29-b4f094d6871c:autoScalingGroupName/my-asg:scheduledActionName/my-recurring-action",
                "StartTime": "2023-12-01T04:00:00Z",
                "Time": "2023-12-01T04:00:00Z",
                "MinSize": 1,
                "MaxSize": 6,
                "DesiredCapacity": 4,
                "TimeZone": "America/New_York"
            }
        ]
    }

For more information, see `Scheduled scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 5: To describe scheduled actions that end at a specified time**

To describe the scheduled actions that end at a specific time, use the ``--end-time`` option. ::

    aws autoscaling describe-scheduled-actions \
        --end-time "2023-12-01T04:00:00Z"

Output::

    {
        "ScheduledUpdateGroupActions": [
            {
                "AutoScalingGroupName": "my-asg",
                "ScheduledActionName": "my-recurring-action",
                "Recurrence": "30 0 1 1,6,12 *",
                "ScheduledActionARN": "arn:aws:autoscaling:us-west-2:123456789012:scheduledUpdateGroupAction:8e86b655-b2e6-4410-8f29-b4f094d6871c:autoScalingGroupName/my-asg:scheduledActionName/my-recurring-action",
                "StartTime": "2023-12-01T04:00:00Z",
                "Time": "2023-12-01T04:00:00Z",
                "MinSize": 1,
                "MaxSize": 6,
                "DesiredCapacity": 4,
                "TimeZone": "America/New_York"
            }
        ]
    }

For more information, see `Scheduled scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 6: To describe a specified number of scheduled actions**

To return a specific number of scheduled actions, use the ``--max-items`` option. ::

    aws autoscaling describe-scheduled-actions \
        --auto-scaling-group-name my-asg \
        --max-items 1

Output::

    {
        "ScheduledUpdateGroupActions": [
            {
                "AutoScalingGroupName": "my-asg",
                "ScheduledActionName": "my-recurring-action",
                "Recurrence": "30 0 1 1,6,12 *",
                "ScheduledActionARN": "arn:aws:autoscaling:us-west-2:123456789012:scheduledUpdateGroupAction:8e86b655-b2e6-4410-8f29-b4f094d6871c:autoScalingGroupName/my-asg:scheduledActionName/my-recurring-action",
                "StartTime": "2023-12-01T04:00:00Z",
                "Time": "2023-12-01T04:00:00Z",
                "MinSize": 1,
                "MaxSize": 6,
                "DesiredCapacity": 4,
                "TimeZone": "America/New_York"
            }
        ]
    }

If the output includes a ``NextToken`` field, there are more scheduled actions. To get the additional scheduled actions, use the value of this field with the ``--starting-token`` option in a subsequent call as follows. ::

    aws autoscaling describe-scheduled-actions \
        --auto-scaling-group-name my-asg \
        --starting-token Z3M3LMPEXAMPLE

For more information, see `Scheduled scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.