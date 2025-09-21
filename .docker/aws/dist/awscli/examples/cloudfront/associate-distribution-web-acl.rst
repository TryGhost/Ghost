**To associate a web ACL with a CloudFront distribution**

The following ``associate-distribution-web-acl`` example associates a web ACL with a CloudFront distribution. ::

    aws cloudfront associate-distribution-web-acl \
        --id E1XNX8R2GOAABC \
        --if-match E2YWS1C2J3OABC \
        --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:global/webacl/web-global-example/626900da-5f64-418b-ba9b-743f3746cABC

Output::

    {
        "ETag": "E3QE7ED60U0ABC",
        "Id": "E1XNX8R2GOAABC",
        "WebACLArn": "arn:aws:wafv2:us-east-1:123456789012:global/webacl/web-global-example/626900da-5f64-418b-ba9b-743f3746cABC"
    }

For more information, see `Use AWS WAF protections <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-awswaf.html>`__ in the *Amazon CloudFront Developer Guide*.
