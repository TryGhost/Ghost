**To create a regex pattern set for use in your web ACLs and rule groups**

The following ``create-regex-pattern-set`` command creates a regex pattern set with two regex patterns specified. ::

    aws wafv2 create-regex-pattern-set \
        --name regexPatterSet01 \
        --scope REGIONAL \
        --description 'Test web-acl' \ 
        --regular-expression-list '[{"RegexString": "/[0-9]*/"},{"RegexString": "/[a-z]*/"}]'

Output::

    {
        "Summary":{
            "ARN":"arn:aws:wafv2:us-west-2:123456789012:regional/regexpatternset/regexPatterSet01/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "Description":"Test web-acl",
            "Name":"regexPatterSet01",
            "LockToken":"0bc01e21-03c9-4b98-9433-6229cbf1ef1c",
            "Id":"a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        }
    }

For more information, see `IP Sets and Regex Pattern Sets <https://docs.aws.amazon.com/waf/latest/developerguide/waf-referenced-set-managing.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
