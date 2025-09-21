**Example 1: To list AWS Health events**

The following ``describe-events`` example lists recent AWS Health events. ::

    aws health describe-events \ 
        --region us-east-1

Output::

    {
        "events": [
            {
                "arn": "arn:aws:health:us-west-1::event/ECS/AWS_ECS_OPERATIONAL_ISSUE/AWS_ECS_OPERATIONAL_ISSUE_KWQPY_EXAMPLE111",
                "service": "ECS",
                "eventTypeCode": "AWS_ECS_OPERATIONAL_ISSUE",
                "eventTypeCategory": "issue",
                "region": "us-west-1",
                "startTime": 1589077890.53,
                "endTime": 1589086345.597,
                "lastUpdatedTime": 1589086345.905,
                "statusCode": "closed",
                "eventScopeCode": "PUBLIC"
            },
            {
                "arn": "arn:aws:health:global::event/BILLING/AWS_BILLING_NOTIFICATION/AWS_BILLING_NOTIFICATION_6ce1d874-e995-40e2-99cd-EXAMPLE1118b",
                "service": "BILLING",
                "eventTypeCode": "AWS_BILLING_NOTIFICATION",
                "eventTypeCategory": "accountNotification",
                "region": "global",
                "startTime": 1588356000.0,
                "lastUpdatedTime": 1588356524.358,
                "statusCode": "open",
                "eventScopeCode": "ACCOUNT_SPECIFIC"
            },
            {
                "arn": "arn:aws:health:us-west-2::event/CLOUDFORMATION/AWS_CLOUDFORMATION_OPERATIONAL_ISSUE/AWS_CLOUDFORMATION_OPERATIONAL_ISSUE_OHTWY_EXAMPLE111",
                "service": "CLOUDFORMATION",
                "eventTypeCode": "AWS_CLOUDFORMATION_OPERATIONAL_ISSUE",
                "eventTypeCategory": "issue",
                "region": "us-west-2",
                "startTime": 1588279630.761,
                "endTime": 1588284650.0,
                "lastUpdatedTime": 1588284691.941,
                "statusCode": "closed",
                "eventScopeCode": "PUBLIC"
            },
            {
                "arn": "arn:aws:health:ap-northeast-1::event/LAMBDA/AWS_LAMBDA_OPERATIONAL_ISSUE/AWS_LAMBDA_OPERATIONAL_ISSUE_JZDND_EXAMPLE111",
                "service": "LAMBDA",
                "eventTypeCode": "AWS_LAMBDA_OPERATIONAL_ISSUE",
                "eventTypeCategory": "issue",
                "region": "ap-northeast-1",
                "startTime": 1587379534.08,
                "endTime": 1587391771.0,
                "lastUpdatedTime": 1587395689.316,
                "statusCode": "closed",
                "eventScopeCode": "PUBLIC"
            },
            {
                "arn": "arn:aws:health:us-east-1::event/EC2/AWS_EC2_OPERATIONAL_ISSUE/AWS_EC2_OPERATIONAL_ISSUE_COBXJ_EXAMPLE111",
                "service": "EC2",
                "eventTypeCode": "AWS_EC2_OPERATIONAL_ISSUE",
                "eventTypeCategory": "issue",
                "region": "us-east-1",
                "startTime": 1586473044.284,
                "endTime": 1586479706.091,
                "lastUpdatedTime": 1586479706.153,
                "statusCode": "closed",
                "eventScopeCode": "PUBLIC"
            },
            {
                "arn": "arn:aws:health:global::event/SECURITY/AWS_SECURITY_NOTIFICATION/AWS_SECURITY_NOTIFICATION_42007387-8129-42da-8c88-EXAMPLE11139",
                "service": "SECURITY",
                "eventTypeCode": "AWS_SECURITY_NOTIFICATION",
                "eventTypeCategory": "accountNotification",
                "region": "global",
                "startTime": 1585674000.0,
                "lastUpdatedTime": 1585674004.132,
                "statusCode": "open",
                "eventScopeCode": "PUBLIC"
            },
            {
                "arn": "arn:aws:health:global::event/CLOUDFRONT/AWS_CLOUDFRONT_OPERATIONAL_ISSUE/AWS_CLOUDFRONT_OPERATIONAL_ISSUE_FRQXG_EXAMPLE111",
                "service": "CLOUDFRONT",
                "eventTypeCode": "AWS_CLOUDFRONT_OPERATIONAL_ISSUE",
                "eventTypeCategory": "issue",
                "region": "global",
                "startTime": 1585610898.589,
                "endTime": 1585617671.0,
                "lastUpdatedTime": 1585620638.869,
                "statusCode": "closed",
                "eventScopeCode": "PUBLIC"
            },
            {
                "arn": "arn:aws:health:us-east-1::event/SES/AWS_SES_OPERATIONAL_ISSUE/AWS_SES_OPERATIONAL_ISSUE_URNDF_EXAMPLE111",
                "service": "SES",
                "eventTypeCode": "AWS_SES_OPERATIONAL_ISSUE",
                "eventTypeCategory": "issue",
                "region": "us-east-1",
                "startTime": 1585342008.46,
                "endTime": 1585344017.0,
                "lastUpdatedTime": 1585344355.989,
                "statusCode": "closed",
                "eventScopeCode": "PUBLIC"
            },
            {
                "arn": "arn:aws:health:global::event/IAM/AWS_IAM_OPERATIONAL_NOTIFICATION/AWS_IAM_OPERATIONAL_NOTIFICATION_b6771c34-6ecd-4aea-9d3e-EXAMPLE1117e",
                "service": "IAM",
                "eventTypeCode": "AWS_IAM_OPERATIONAL_NOTIFICATION",
                "eventTypeCategory": "accountNotification",
                "region": "global",
                "startTime": 1584978300.0,
                "lastUpdatedTime": 1584978553.572,
                "statusCode": "open",
                "eventScopeCode": "ACCOUNT_SPECIFIC"
            },
            {
                "arn": "arn:aws:health:ap-southeast-2::event/EC2/AWS_EC2_OPERATIONAL_ISSUE/AWS_EC2_OPERATIONAL_ISSUE_HNGHE_EXAMPLE111",
                "service": "EC2",
                "eventTypeCode": "AWS_EC2_OPERATIONAL_ISSUE",
                "eventTypeCategory": "issue",
                "region": "ap-southeast-2",
                "startTime": 1583881487.483,
                "endTime": 1583885056.785,
                "lastUpdatedTime": 1583885057.052,
                "statusCode": "closed",
                "eventScopeCode": "PUBLIC"
            }
        ]
    }

For more information, see `Getting started with the AWS Personal Health Dashboard <https://docs.aws.amazon.com/health/latest/ug/getting-started-phd.html>`__ in the *AWS Health User Guide*.

**Example 2: To list AWS Health events by service and event status code**

The following ``describe-events`` example lists AWS Health events for Amazon Elastic Compute Cloud (Amazon EC2) where the event status is closed. ::

    aws health describe-events \
        --filter "services=EC2,eventStatusCodes=closed"

Output::

    {
        "events": [
            {
                "arn": "arn:aws:health:us-east-1::event/EC2/AWS_EC2_OPERATIONAL_ISSUE/AWS_EC2_OPERATIONAL_ISSUE_VKTXI_EXAMPLE111",
                "service": "EC2",
                "eventTypeCode": "AWS_EC2_OPERATIONAL_ISSUE",
                "eventTypeCategory": "issue",
                "region": "us-east-1",
                "startTime": 1587462325.096,
                "endTime": 1587464204.774,
                "lastUpdatedTime": 1587464204.865,
                "statusCode": "closed",
                "eventScopeCode": "PUBLIC"
            },
            {
                "arn": "arn:aws:health:us-east-1::event/EC2/AWS_EC2_OPERATIONAL_ISSUE/AWS_EC2_OPERATIONAL_ISSUE_COBXJ_EXAMPLE111",
                "service": "EC2",
                "eventTypeCode": "AWS_EC2_OPERATIONAL_ISSUE",
                "eventTypeCategory": "issue",
                "region": "us-east-1",
                "startTime": 1586473044.284,
                "endTime": 1586479706.091,
                "lastUpdatedTime": 1586479706.153,
                "statusCode": "closed",
                "eventScopeCode": "PUBLIC"
            },
            {
                "arn": "arn:aws:health:ap-southeast-2::event/EC2/AWS_EC2_OPERATIONAL_ISSUE/AWS_EC2_OPERATIONAL_ISSUE_HNGHE_EXAMPLE111",
                "service": "EC2",
                "eventTypeCode": "AWS_EC2_OPERATIONAL_ISSUE",
                "eventTypeCategory": "issue",
                "region": "ap-southeast-2",
                "startTime": 1583881487.483,
                "endTime": 1583885056.785,
                "lastUpdatedTime": 1583885057.052,
                "statusCode": "closed",
                "eventScopeCode": "PUBLIC"
            }
        ]
    }

For more information, see `Getting started with the AWS Personal Health Dashboard <https://docs.aws.amazon.com/health/latest/ug/getting-started-phd.html>`__ in the *AWS Health User Guide*.