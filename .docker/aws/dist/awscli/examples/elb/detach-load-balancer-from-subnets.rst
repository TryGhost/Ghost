**To detach load balancers from subnets**

This example detaches the specified load balancer from the specified subnet.

Command::

     aws elb detach-load-balancer-from-subnets --load-balancer-name my-load-balancer --subnets subnet-0ecac448

Output::

   {
      "Subnets": [
          "subnet-15aaab61"
      ]
   }

