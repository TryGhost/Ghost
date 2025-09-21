**To enable Availability Zones for a load balancer**

This example adds the specified Availability Zone to the specified load balancer.

Command::

    aws elb enable-availability-zones-for-load-balancer --load-balancer-name my-load-balancer --availability-zones us-west-2b

Output::

    {
        "AvailabilityZones": [
            "us-west-2a",
            "us-west-2b"
        ]
    }

