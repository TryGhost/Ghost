**To retrieve the resources associated with a web ACL**

The following ``list-resources-for-web-acl`` retrieves the API Gateway REST API resources that are currently associated with the specified web ACL in the region ``us-west-2``. ::

    aws wafv2 list-resources-for-web-acl \
        --web-acl-arn arn:aws:wafv2:us-west-2:123456789012:regional/webacl/TestWebAcl/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --resource-type API_GATEWAY \
        --region us-west-2

Output::

    {
        "ResourceArns": [
            "arn:aws:apigateway:us-west-2::/restapis/EXAMPLE111/stages/testing"
        ]
    }

For more information, see `Associating or Disassociating a Web ACL with an AWS Resource <https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-associating-aws-resource.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
