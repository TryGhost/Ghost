**To deregister instances from a load balancer**

This example deregisters the specified instance from the specified load balancer.

Command::

      aws elb deregister-instances-from-load-balancer --load-balancer-name my-load-balancer --instances i-d6f6fae3


Output::

    {
        "Instances": [
            {
                "InstanceId": "i-207d9717"
            },
            {
                "InstanceId": "i-afefb49b"
            }
        ]
    }

