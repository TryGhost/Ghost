**To retrieve a specific IP set**

The following ``get-ip-set`` retrieves the IP set with the specified name, scope, and ID. You can get the ID for an IP set from the commands ``create-ip-set`` and ``list-ip-sets``. ::

    aws wafv2 get-ip-set \
        --name testip \
        --scope REGIONAL \ 
        --id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 

Output::

    {
        "IPSet":{
            "Description":"",
            "Name":"testip",
            "IPAddressVersion":"IPV4",
            "Id":"a1b2c3d4-5678-90ab-cdef-EXAMPLE1111",
            "ARN":"arn:aws:wafv2:us-west-2:123456789012:regional/ipset/testip/a1b2c3d4-5678-90ab-cdef-EXAMPLE1111",
            "Addresses":[
                "192.0.2.0/16"
            ]
        },
        "LockToken":"447e55ac-2396-4c6d-b9f9-86b67c17f8b5"
    } 

For more information, see `IP Sets and Regex Pattern Sets <https://docs.aws.amazon.com/waf/latest/developerguide/waf-referenced-set-managing.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
