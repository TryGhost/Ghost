**To update the SSL certificate for an HTTPS load balancer**

This example replaces the existing SSL certificate for the specified HTTPS load balancer.

Command::

    aws elb set-load-balancer-listener-ssl-certificate --load-balancer-name my-load-balancer --load-balancer-port 443 --ssl-certificate-id arn:aws:iam::123456789012:server-certificate/new-server-cert

