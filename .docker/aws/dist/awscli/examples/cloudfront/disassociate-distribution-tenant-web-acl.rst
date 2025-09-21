**To disassociate a web ACL from a distribution tenant**

The following ``disassociate-distribution-tenant-web-acl`` example disassociates a web ACL from a distribution tenant with ETag ``E1PA6795UKMABC``. ::

    aws cloudfront disassociate-distribution-tenant-web-acl \
        --id dt_2wjDZi3hD1ivOXf6rpZJOSNE1AB \
        --if-match E1PA6795UKMABC

Output::

    {
        "ETag": "E13V1IB3VIYABC",
        "Id": "dt_2wjDZi3hD1ivOXf6rpZJOSNE1AB"
    }

For more information, see `Disable AWS WAF security protections <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/disable-waf.html>`__ in the *Amazon CloudFront Developer Guide*.