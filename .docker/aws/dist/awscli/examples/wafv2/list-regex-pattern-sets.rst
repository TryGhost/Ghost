**To retrieve a list of regex pattern sets**

The following ``list-regex-pattern-sets`` retrieves all regex pattern sets for the account that are defined in the region ``us-west-2``. ::

    aws wafv2 list-regex-pattern-sets \
    --scope REGIONAL \
    --region us-west-2

Output::

    {
        "NextMarker":"regexPatterSet01",
        "RegexPatternSets":[
            {
                "ARN":"arn:aws:wafv2:us-west-2:123456789012:regional/regexpatternset/regexPatterSet01/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "Description":"Test web-acl",
                "Name":"regexPatterSet01",
                "LockToken":"f17743f7-0000-0000-0000-19a8b93bfb01",
                "Id":"a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
            }
        ]
    }

For more information, see `IP Sets and Regex Pattern Sets <https://docs.aws.amazon.com/waf/latest/developerguide/waf-referenced-set-managing.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
