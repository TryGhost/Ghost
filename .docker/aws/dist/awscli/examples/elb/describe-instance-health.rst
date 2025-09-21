**To describe the health of the instances for a load balancer**

This example describes the health of the instances for the specified load balancer.

Command::

  aws elb describe-instance-health --load-balancer-name my-load-balancer

Output::

  {
    "InstanceStates": [
        {
            "InstanceId": "i-207d9717",
            "ReasonCode": "N/A",
            "State": "InService",
            "Description": "N/A"
        },
        {
            "InstanceId": "i-afefb49b",
            "ReasonCode": "N/A",
            "State": "InService",
            "Description": "N/A"
        }
    ]
  }

**To describe the health of an instance for a load balancer**

This example describes the health of the specified instance for the specified load balancer.

Command::

  aws elb describe-instance-health --load-balancer-name my-load-balancer --instances i-7299c809

The following is an example response for an instance that is registering.

Output::

  {
    "InstanceStates": [
        {
            "InstanceId": "i-7299c809",
            "ReasonCode": "ELB",
            "State": "OutOfService",
            "Description": "Instance registration is still in progress."
      }
    ]
  }

The following is an example response for an unhealthy instance.

Output::

  {
    "InstanceStates": [
        {
            "InstanceId": "i-7299c809",
            "ReasonCode": "Instance",
            "State": "OutOfService",
            "Description": "Instance has failed at least the UnhealthyThreshold number of health checks consecutively."
        }
    ]
  }
