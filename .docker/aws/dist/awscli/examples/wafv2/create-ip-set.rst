**To create an IP set for use in your web ACLs and rule groups**

The following ``create-ip-set`` command creates an IP set with a single address range specification. ::

    aws wafv2 create-ip-set \
        --name testip \
        --scope REGIONAL \
        --ip-address-version IPV4 \
        --addresses 198.51.100.0/16

Output::

    {
        "Summary":{
            "ARN":"arn:aws:wafv2:us-west-2:123456789012:regional/ipset/testip/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "Description":"",
            "Name":"testip",
            "LockToken":"447e55ac-0000-0000-0000-86b67c17f8b5",
            "Id":"a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        }
    }

For more information, see `IP Sets and Regex Pattern Sets <https://docs.aws.amazon.com/waf/latest/developerguide/waf-referenced-set-managing.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
