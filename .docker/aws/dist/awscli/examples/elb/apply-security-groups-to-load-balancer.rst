**To associate a security group with a load balancer in a VPC**

This example associates a security group with the specified load balancer in a VPC.

Command::

   aws elb apply-security-groups-to-load-balancer --load-balancer-name my-load-balancer --security-groups sg-fc448899

Output::

   {
     "SecurityGroups": [
         "sg-fc448899"
     ]
   }

