**To retrieve a list of IP addresses that are blocked by a rate-based rule**

The following ``get-rate-based-statement-managed-keys`` retrieves the IP addresses currently blocked by a rate-based rule that's being used for a regional application. ::

    aws wafv2 get-rate-based-statement-managed-keys \
        --scope REGIONAL \
        --web-acl-name testwebacl2 \
        --web-acl-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --rule-name ratebasedtest

Output::

    {
        "ManagedKeysIPV4":{
            "IPAddressVersion":"IPV4",
            "Addresses":[
                "198.51.100.0/32"
            ]
        },
        "ManagedKeysIPV6":{
            "IPAddressVersion":"IPV6",
            "Addresses":[

            ]
        }
    } 

For more information, see `Rate-Based Rule Statement <https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
