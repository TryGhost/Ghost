**To associate a web ACL with a CloudFront distribution tenant**

The following ``associate-distribution-tenant-web-acl`` example associates a web ACL with a CloudFront distribution with ETag ``E13V1IB3VIYABC``. ::

    aws cloudfront associate-distribution-tenant-web-acl \
        --id dt_2wjDZi3hD1ivOXf6rpZJO1AB \
        --if-match E13V1IB3VIYABC \
        --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:global/webacl/web-global-example/626900da-5f64-418b-ba9b-743f37123ABC

Output::

    {
        "ETag": "E1VC38T7YXBABC",
        "Id": "dt_2wjDZi3hD1ivOXf6rpZJO1AB",
        "WebACLArn": "arn:aws:wafv2:us-east-1:123456789012:global/webacl/web-global-example/626900da-5f64-418b-ba9b-743f37123ABC"
    }

For more information, see `Use AWS WAF protections <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-awswaf.html>`__ in the *Amazon CloudFront Developer Guide*.