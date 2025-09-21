**To retrieve the logging configurations for a web ACL**

The following ``get-logging-configuration`` retrieves the logging configuration for the specified web ACL. ::

    aws wafv2 get-logging-configuration \
        --resource-arn arn:aws:wafv2:us-west-2:123456789012:regional/webacl/test/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222 \
        --region us-west-2

Output::

    {
        "LoggingConfiguration":{
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
    } 

For more information, see `Logging Web ACL Traffic Information <https://docs.aws.amazon.com/waf/latest/developerguide/logging.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
