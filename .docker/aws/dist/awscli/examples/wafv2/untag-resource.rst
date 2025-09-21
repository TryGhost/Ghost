**To remove tags from an AWS WAF resource**

The following ``untag-resource`` example removes the tag with the key ``KeyName`` from the specified web ACL. ::

    aws wafv2 untag-resource \
        --resource-arn arn:aws:wafv2:us-west-2:123456789012:regional/webacl/apiGatewayWebAcl/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --tag-keys "KeyName"

This command produces no output.

For more information, see `Getting Started with AWS WAF <https://docs.aws.amazon.com/waf/latest/developerguide/getting-started.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
