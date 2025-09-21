**To create a hosted zone**

The following ``create-hosted-zone`` command adds a hosted zone named ``example.com`` using the caller reference ``2014-04-01-18:47``. The optional comment includes a space, so it must be enclosed in quotation marks::

  aws route53 create-hosted-zone --name example.com --caller-reference 2014-04-01-18:47 --hosted-zone-config Comment="command-line version"

For more information, see `Working with Hosted Zones`_ in the *Amazon Route 53 Developer Guide*.

.. _`Working with Hosted Zones`: http://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html

