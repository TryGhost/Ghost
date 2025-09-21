**To check the availability of a CNAME**

The following command checks the availability of the subdomain ``my-cname.elasticbeanstalk.com``::

  aws elasticbeanstalk check-dns-availability --cname-prefix my-cname

Output::

  {
      "Available": true,
      "FullyQualifiedCNAME": "my-cname.elasticbeanstalk.com"
  }
