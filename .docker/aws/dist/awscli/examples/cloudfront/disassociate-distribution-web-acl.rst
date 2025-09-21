**To disassociate a web ACL from a CloudFront distribution**

The following ``disassociate-distribution-web-acl`` example removes the association between a web ACL and a CloudFront distribution with ETag ``E13V1IB3VIYABC``. ::

    aws cloudfront disassociate-distribution-web-acl \
        --id E1XNX8R2GOAABC \
        --if-match EEZQ9Z24VM1ABC

Output::

    {
        "ETag": "E2YWS1C2J3OABC",
        "Id": "E1XNX8R2GOAABC"
    }

For more information, see `Disable AWS WAF security protections <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/disable-waf.html>`__ in the *Amazon CloudFront Developer Guide*.