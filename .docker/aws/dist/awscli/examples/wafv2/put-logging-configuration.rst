**To add a logging configuration to a web ACL**

The following ``put-logging-configuration`` adds the Amazon Kinesis Data Firehose logging configuration ``aws-waf-logs-custom-transformation`` to the specified web ACL, with no fields redacted from the logs. ::

    aws wafv2 put-logging-configuration \
        --logging-configuration ResourceArn=arn:aws:wafv2:us-west-2:123456789012:regional/webacl/test-cli/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111,LogDestinationConfigs=arn:aws:firehose:us-west-2:123456789012:deliverystream/aws-waf-logs-custom-transformation \
		--region us-west-2
		
Output::

    {
        "LoggingConfiguration":{
            "ResourceArn":"arn:aws:wafv2:us-west-2:123456789012:regional/webacl/test-cli/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "LogDestinationConfigs":[
                "arn:aws:firehose:us-west-2:123456789012:deliverystream/aws-waf-logs-custom-transformation"
            ]
        }
    }        

For more information, see `Logging Web ACL Traffic Information <https://docs.aws.amazon.com/waf/latest/developerguide/logging.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
