**Example 1: To describe one or more instances**

This example describes the specified instance. ::

    aws autoscaling describe-auto-scaling-instances \
        --instance-ids i-06905f55584de02da

Output::

    {
        "AutoScalingInstances": [
            {
                "InstanceId": "i-06905f55584de02da",
                "InstanceType": "t2.micro",
                "AutoScalingGroupName": "my-asg",
                "AvailabilityZone": "us-west-2b",
                "LifecycleState": "InService",
                "HealthStatus": "HEALTHY",
                "ProtectedFromScaleIn": false,
                "LaunchTemplate": {
                    "LaunchTemplateId": "lt-1234567890abcde12",
                    "LaunchTemplateName": "my-launch-template",
                    "Version": "1"
                }
            }
        ]
    }

**Example 2: To describe one or more instances**

This example uses the ``--max-items`` option to specify how many instances to return with this call. ::

    aws autoscaling describe-auto-scaling-instances \
        --max-items 1

If the output includes a ``NextToken`` field, there are more instances. To get the additional instances, use the value of this field with the ``--starting-token`` option in a subsequent call as follows. ::

    aws autoscaling describe-auto-scaling-instances \
        --starting-token Z3M3LMPEXAMPLE

See example 1 for sample output.

**Example 3: To describe instances that use launch configurations**

This example uses the ``--query`` option to describe instances that use launch configurations. ::

    aws autoscaling describe-auto-scaling-instances \
        --query 'AutoScalingInstances[?LaunchConfigurationName!=`null`]'

Output::

    [
        {
            "InstanceId": "i-088c57934a6449037",
            "InstanceType": "t2.micro",
            "AutoScalingGroupName": "my-asg",
            "AvailabilityZone": "us-west-2c",
            "LifecycleState": "InService",
            "HealthStatus": "HEALTHY",
            "LaunchConfigurationName": "my-lc",
            "ProtectedFromScaleIn": false
        }
    ]

For more information, see `Filter AWS CLI output <https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html>`__ in the *AWS Command Line Interface User Guide*.