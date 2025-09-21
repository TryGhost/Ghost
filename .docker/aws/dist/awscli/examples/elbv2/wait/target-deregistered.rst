**To pause running until a target is deregistered**

The following ``wait target-deregistered`` command pauses and continues only after it confirms that the specified target is deregistered.

    aws elbv2 wait target-deregistered \
        --target-group-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067 \
        --targets Id=i-1234567890abcdef0,Port=80

This command produces no output.
