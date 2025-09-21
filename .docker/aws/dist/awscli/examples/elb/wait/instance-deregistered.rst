**To pause running until an instance is deregistered**

The following ``wait instance-deregistered`` command pauses and continues only after it can confirm that the specified instance is deregistered.

    aws elb wait instance-deregistered \
        --load-balancer-name my-loadbalancer \
        --instances InstanceId=i-1234567890abcdef0

This command produces no output.
