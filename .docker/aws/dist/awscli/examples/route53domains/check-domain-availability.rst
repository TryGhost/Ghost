**To determine whether you can register a domain name with Route 53**

The following ``check-domain-availability`` command returns information about whether the domain name ``example.com``
is available to be registered using Route 53. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains check-domain-availability \
        --region us-east-1 \
        --domain-name example.com

Output::

    {
        "Availability": "UNAVAILABLE"
    }

Route 53 supports a large number of top-level domains (TLDs), such as ``.com`` and ``.jp``, but we don't support all available TLDs. If you check the availability of a domain and Route 53 doesn't support the TLD, ``check-domain-availability`` returns the following message. ::

    An error occurred (UnsupportedTLD) when calling the CheckDomainAvailability operation: <top-level domain> tld is not supported.

For a list of the TLDs that you can use when registering a domain with Route 53, see `Domains That You Can Register with Amazon Route 53 <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/registrar-tld-list.html>`__ in the *Amazon Route 53 Developer Guide*. 
For more information about registering domains with Amazon Route 53, see `Registering a New Domain <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html>`__ in the *Amazon Route 53 Developer Guide*.