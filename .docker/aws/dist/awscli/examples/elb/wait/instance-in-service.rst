**To pause running until the specified instance is in service**

The following ``wait instance-in-service`` command pauses and continues only after it can confirm that the specified instance is in service. ::

    aws elb wait instance-in-service \
        --load-balancer-name my-loadbalancer \
        --instances InstanceId=i-1234567890abcdef0

This command produces no output.