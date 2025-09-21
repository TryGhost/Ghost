**To create a health check**

The following ``create-health-check`` command creates a health check using the caller reference ``2014-04-01-18:47`` and the JSON-formatted configuration in the file ``C:\awscli\route53\create-health-check.json``::

  aws route53 create-health-check --caller-reference 2014-04-01-18:47 --health-check-config file://C:\awscli\route53\create-health-check.json

JSON syntax::

  {
    "IPAddress": "IP address of the endpoint to check",
    "Port": port on the endpoint to check--required when Type is "TCP",
    "Type": "HTTP"|"HTTPS"|"HTTP_STR_MATCH"|"HTTPS_STR_MATCH"|"TCP",
    "ResourcePath": "path of the file that you want Amazon Route 53 to request--all Types except TCP",
    "FullyQualifiedDomainName": "domain name of the endpoint to check--all Types except TCP",
    "SearchString": "if Type is HTTP_STR_MATCH or HTTPS_STR_MATCH, the string to search for in the response body from the specified resource",
    "RequestInterval": 10 | 30,
    "FailureThreshold": integer between 1 and 10
  }


To add the health check to a Route 53 resource record set, use the ``change-resource-record-sets`` command.

For more information, see `Amazon Route 53 Health Checks and DNS Failover`_ in the *Amazon Route 53 Developer Guide*.

.. _`Amazon Route 53 Health Checks and DNS Failover`: http://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html

