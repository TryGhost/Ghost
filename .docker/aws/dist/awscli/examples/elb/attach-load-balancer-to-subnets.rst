**To attach subnets to a load balancer**

This example adds the specified subnet to the set of configured subnets for the specified load balancer.

Command::

  aws elb attach-load-balancer-to-subnets --load-balancer-name my-load-balancer --subnets subnet-0ecac448

Output::

   {
      "Subnets": [
          "subnet-15aaab61",
          "subnet-0ecac448"
      ]
   }

