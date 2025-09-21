**To retrieve a specific regex pattern set**

The following ``get-regex-pattern-set`` retrieves the regex pattern set with the specified name, scope, region, and ID. You can get the ID for a regex pattern set from the commands ``create-regex-pattern-set`` and ``list-regex-pattern-sets``. ::

    aws wafv2 get-regex-pattern-set \
        --name regexPatterSet01 \
        --scope REGIONAL \
        --id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --region us-west-2

Output::

    {
        "RegexPatternSet":{
            "Description":"Test web-acl",
            "RegularExpressionList":[
                {
                    "RegexString":"/[0-9]*/"
                },
                {
                    "RegexString":"/[a-z]*/"
                }
            ],
            "Name":"regexPatterSet01",
            "ARN":"arn:aws:wafv2:us-west-2:123456789012:regional/regexpatternset/regexPatterSet01/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "Id":"a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        },
        "LockToken":"c8abf33f-b6fc-46ae-846e-42f994d57b29"
    } 

For more information, see `IP Sets and Regex Pattern Sets <https://docs.aws.amazon.com/waf/latest/developerguide/waf-referenced-set-managing.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
