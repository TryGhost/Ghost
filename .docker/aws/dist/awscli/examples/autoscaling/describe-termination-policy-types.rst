**To describe available termination policy types**

This example describes the available termination policy types. ::

    aws autoscaling describe-termination-policy-types

Output::

    {
        "TerminationPolicyTypes": [
            "AllocationStrategy",
            "ClosestToNextInstanceHour",
            "Default",
            "NewestInstance",
            "OldestInstance",
            "OldestLaunchConfiguration",
            "OldestLaunchTemplate"
        ]
    }

For more information, see `Controlling which Auto Scaling instances terminate during scale in <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-instance-termination.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

