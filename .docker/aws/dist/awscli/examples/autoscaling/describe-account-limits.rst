**To describe your Amazon EC2 Auto Scaling account limits**

This example describes the Amazon EC2 Auto Scaling limits for your AWS account. ::

    aws autoscaling describe-account-limits

Output::

    {
        "NumberOfLaunchConfigurations": 5,
        "MaxNumberOfLaunchConfigurations": 100,
        "NumberOfAutoScalingGroups": 3,
        "MaxNumberOfAutoScalingGroups": 20
    }

For more information, see `Amazon EC2 Auto Scaling service quotas <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-account-limits.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.
