**To list query logging configurations**

The following ``list-query-logging-configs`` example lists information about the first 100 query logging configurations in your AWS account, for the hosted zone ``Z1OX3WQEXAMPLE``. ::

    aws route53 list-query-logging-configs \
        --hosted-zone-id Z1OX3WQEXAMPLE

Output::

    {
        "QueryLoggingConfigs": [
            {
                "Id": "964ff34e-ae03-4f06-80a2-9683cexample",
                "HostedZoneId": "Z1OX3WQEXAMPLE",
                "CloudWatchLogsLogGroupArn": "arn:aws:logs:us-east-1:111122223333:log-group:/aws/route53/example.com:*"
            }
        ]
    }

For more information, see 
`Logging DNS queries <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/query-logs.html>`__ in the *Amazon Route 53 Developer Guide*.