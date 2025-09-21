**To replace the policies associated with a listener**

This example replaces the policies that are currently associated with the specified listener.

Command::

  aws elb set-load-balancer-policies-of-listener --load-balancer-name my-load-balancer --load-balancer-port 443 --policy-names my-SSLNegotiation-policy


**To remove all policies associated with your listener**

This example removes all policies that are currently associated with the specified listener.

Command::

  aws elb set-load-balancer-policies-of-listener --load-balancer-name my-load-balancer --load-balancer-port 443 --policy-names []

To confirm that the policies are removed from the load balancer, use the ``describe-load-balancer-policies`` command.

