**To replace the policies associated with a port for a backend instance**

This example replaces the policies that are currently associated with the specified port.

Command::

  aws elb set-load-balancer-policies-for-backend-server --load-balancer-name my-load-balancer --instance-port 80 --policy-names my-ProxyProtocol-policy


**To remove all policies that are currently associated with a port on your backend instance**

This example removes all policies associated with the specified port.

Command::

  aws elb set-load-balancer-policies-for-backend-server --load-balancer-name my-load-balancer --instance-port 80 --policy-names []


To confirm that the policies are removed, use the ``describe-load-balancer-policies`` command.

