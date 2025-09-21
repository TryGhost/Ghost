**To retrieve all tags for an AWS WAF resource**

The following ``list-tags-for-resource`` retrieves the list of all tag key, value pairs for the specified web ACL. ::

    aws wafv2 list-tags-for-resource \
        --resource-arn arn:aws:wafv2:us-west-2:123456789012:regional/webacl/testwebacl2/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "NextMarker":"",
        "TagInfoForResource":{
            "ResourceARN":"arn:aws:wafv2:us-west-2:123456789012:regional/webacl/testwebacl2/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "TagList":[

            ]
        }
    }

For more information, see `Getting Started with AWS WAF <https://docs.aws.amazon.com/waf/latest/developerguide/getting-started.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
