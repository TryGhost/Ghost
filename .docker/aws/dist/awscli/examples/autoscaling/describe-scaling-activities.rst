**Example 1: To describe scaling activities for the specified group**

This example describes the scaling activities for the specified Auto Scaling group. ::

    aws autoscaling describe-scaling-activities \
        --auto-scaling-group-name my-asg

Output::

    {
        "Activities": [
            {
                "ActivityId": "f9f2d65b-f1f2-43e7-b46d-d86756459699",
                "Description": "Launching a new EC2 instance: i-0d44425630326060f",
                "AutoScalingGroupName": "my-asg",
                "Cause": "At 2020-10-30T19:35:51Z a user request update of AutoScalingGroup constraints to min: 0, max: 16, desired: 16 changing the desired capacity from 0 to 16.  At 2020-10-30T19:36:07Z an instance was started in response to a difference between desired and actual capacity, increasing the capacity from 0 to 16.",
                "StartTime": "2020-10-30T19:36:09.766Z",
                "EndTime": "2020-10-30T19:36:41Z",
                "StatusCode": "Successful",
                "Progress": 100,
                "Details": "{\"Subnet ID\":\"subnet-5ea0c127\",\"Availability Zone\":\"us-west-2b\"}"
            }
        ]
    }

For more information, see `Verify a scaling activity for an Auto Scaling group <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-verify-scaling-activity.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 2: To describe the scaling activities for a deleted group**

To describe scaling activities after the Auto Scaling group has been deleted, add the ``--include-deleted-groups`` option. ::

    aws autoscaling describe-scaling-activities \
        --auto-scaling-group-name my-asg \
        --include-deleted-groups

Output::

    {
        "Activities": [
            {
                "ActivityId": "e1f5de0e-f93e-1417-34ac-092a76fba220",
                "Description": "Launching a new EC2 instance.  Status Reason: Your Spot request price of 0.001 is lower than the minimum required Spot request fulfillment price of 0.0031. Launching EC2 instance failed.",
                "AutoScalingGroupName": "my-asg",
                "Cause": "At 2021-01-13T20:47:24Z a user request update of AutoScalingGroup constraints to min: 1, max: 5, desired: 3 changing the desired capacity from 0 to 3.  At 2021-01-13T20:47:27Z an instance was started in response to a difference between desired and actual capacity, increasing the capacity from 0 to 3.",
                "StartTime": "2021-01-13T20:47:30.094Z",
                "EndTime": "2021-01-13T20:47:30Z",
                "StatusCode": "Failed",
                "StatusMessage": "Your Spot request price of 0.001 is lower than the minimum required Spot request fulfillment price of 0.0031. Launching EC2 instance failed.",
                "Progress": 100,
                "Details": "{\"Subnet ID\":\"subnet-5ea0c127\",\"Availability Zone\":\"us-west-2b\"}",
                "AutoScalingGroupState": "Deleted",
                "AutoScalingGroupARN": "arn:aws:autoscaling:us-west-2:123456789012:autoScalingGroup:283179a2-f3ce-423d-93f6-66bb518232f7:autoScalingGroupName/my-asg"
            }
        ]
    }

For more information, see `Troubleshoot Amazon EC2 Auto Scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/CHAP_Troubleshooting.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 3: To describe a specified number of scaling activities**

To return a specific number of activities, use the ``--max-items`` option. ::

    aws autoscaling describe-scaling-activities \
        --max-items 1

Output::

    {
        "Activities": [
            {
                "ActivityId": "f9f2d65b-f1f2-43e7-b46d-d86756459699",
                "Description": "Launching a new EC2 instance: i-0d44425630326060f",
                "AutoScalingGroupName": "my-asg",
                "Cause": "At 2020-10-30T19:35:51Z a user request update of AutoScalingGroup constraints to min: 0, max: 16, desired: 16 changing the desired capacity from 0 to 16.  At 2020-10-30T19:36:07Z an instance was started in response to a difference between desired and actual capacity, increasing the capacity from 0 to 16.",
                "StartTime": "2020-10-30T19:36:09.766Z",
                "EndTime": "2020-10-30T19:36:41Z",
                "StatusCode": "Successful",
                "Progress": 100,
                "Details": "{\"Subnet ID\":\"subnet-5ea0c127\",\"Availability Zone\":\"us-west-2b\"}"
            }
        ]
    }

If the output includes a ``NextToken`` field, there are more activities. To get the additional activities, use the value of this field with the ``--starting-token`` option in a subsequent call as follows. ::

    aws autoscaling describe-scaling-activities \
        --starting-token Z3M3LMPEXAMPLE

For more information, see `Verify a scaling activity for an Auto Scaling group <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-verify-scaling-activity.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.