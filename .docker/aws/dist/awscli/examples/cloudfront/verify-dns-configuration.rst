**To verify DNS configuration for a domain**

The following ``verify-dns-configuration`` example verifies the DNS configuration for a domain. ::

    aws cloudfront verify-dns-configuration \
        --domain example.com \
        --identifier dt_2x9GhoK0TZRsohWzv1b9It8J1AB

Output::

    {
        "DnsConfigurationList": [
            {
                "Domain": "example.com",
                "Status": "valid-configuration"
            }
        ]
    }

For more information, see `Move an alternate domain name to a different distribution <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/alternate-domain-names-move.html>`__ in the *Amazon CloudFront Developer Guide*.
