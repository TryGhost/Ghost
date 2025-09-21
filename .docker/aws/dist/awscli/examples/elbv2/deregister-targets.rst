**Example 1: To deregister a target from a target group**

The following ``deregister-targets`` example removes the specified instance from the specified target group. ::

    aws elbv2 deregister-targets \
        --target-group-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067 \
        --targets Id=i-1234567890abcdef0

**Example 2: To deregister a target registered using port overrides**

The following ``deregister-targets`` example removes an instance from a target group that was registered using port overrides. ::

    aws elbv2 deregister-targets \
        --target-group-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-internal-targets/3bb63f11dfb0faf9 \
        --targets Id=i-1234567890abcdef0,Port=80 Id=i-1234567890abcdef0,Port=766
