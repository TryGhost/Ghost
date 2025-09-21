**To create a logging configuration for the web ACL ARN with the specified Kinesis Firehose stream ARN**

The following ``put-logging-configuration`` example displays logging configuration for WAF with ALB/APIGateway in Region ``us-east-1``. ::

    aws waf-regional put-logging-configuration \
        --logging-configuration ResourceArn=arn:aws:waf-regional:us-east-1:123456789012:webacl/3bffd3ed-fa2e-445e-869f-a6a7cf153fd3,LogDestinationConfigs=arn:aws:firehose:us-east-1:123456789012:deliverystream/aws-waf-logs-firehose-stream,RedactedFields=[] \
        --region us-east-1

Output::

    {
        "LoggingConfiguration": {
            "ResourceArn": "arn:aws:waf-regional:us-east-1:123456789012:webacl/3bffd3ed-fa2e-445e-869f-a6a7cf153fd3",
            "LogDestinationConfigs": [
                "arn:aws:firehose:us-east-1:123456789012:deliverystream/aws-waf-logs-firehose-stream"
            ]
        }
    }
    
