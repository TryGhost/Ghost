**To retrieve a list of all logging configurations for a region**

The following ``list-logging-configurations`` retrieves the all logging configurations for web ACLs that are scoped for regional use in the ``us-west-2`` region. ::

    aws wafv2 list-logging-configurations \
        --scope REGIONAL \
        --region us-west-2 

Output::

    {
        "LoggingConfigurations":[
            {
                "ResourceArn":"arn:aws:wafv2:us-west-2:123456789012:regional/webacl/test-2/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "RedactedFields":[
                    {
                        "QueryString":{

                        } 
                    }
                ],
                "LogDestinationConfigs":[
                    "arn:aws:firehose:us-west-2:123456789012:deliverystream/aws-waf-logs-test"
                ]
            },
            {
                "ResourceArn":"arn:aws:wafv2:us-west-2:123456789012:regional/webacl/test/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "RedactedFields":[
                    {
                        "Method":{

                        }
                    }
                ],
                "LogDestinationConfigs":[
                    "arn:aws:firehose:us-west-2:123456789012:deliverystream/aws-waf-logs-custom-transformation"
                ]
            }
        ]
    }

For more information, see `Logging Web ACL Traffic Information <https://docs.aws.amazon.com/waf/latest/developerguide/logging.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
