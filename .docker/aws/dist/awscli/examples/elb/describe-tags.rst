**To describe the tags assigned to a load balancer**

This example describes the tags assigned to the specified load balancer.

Command::

  aws elb describe-tags --load-balancer-name my-load-balancer

Output::

  {
    "TagDescriptions": [
        {
            "Tags": [                
                {
                    "Value": "lima", 
                    "Key": "project"
                },
                {
                    "Value": "digital-media",
                    "Key": "department"
                }
            ], 
            "LoadBalancerName": "my-load-balancer"
        }
    ]
  }

