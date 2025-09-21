**To pause running until a registered target is in service**

The following ``wait target-in-service`` command pauses and continues only after it confirms that the specified target is in service.

    aws elbv2 wait target-in-service \
        --target-group-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067 \
        --targets Id=i-1234567890abcdef0,Port=80

This command produces no output.
