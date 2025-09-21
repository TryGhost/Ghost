**To list the quotas for a service**

The following ``list-service-quotas`` example displays details about the quotas for AWS CloudFormation. ::

    aws service-quotas list-service-quotas \
        --service-code cloudformation

Output::

    {
        "Quotas": [
            {
                "ServiceCode": "cloudformation",
                "ServiceName": "AWS CloudFormation",
                "QuotaArn": "arn:aws:servicequotas:us-east-2:123456789012:cloudformation/L-87D14FB7",
                "QuotaCode": "L-87D14FB7",
                "QuotaName": "Output count in CloudFormation template",
                "Value": 60.0,
                "Unit": "None",
                "Adjustable": false,
                "GlobalQuota": false
            },
            {
                "ServiceCode": "cloudformation",
                "ServiceName": "AWS CloudFormation",
                "QuotaArn": "arn:aws:servicequotas:us-east-2:123456789012:cloudformation/L-0485CB21",
                "QuotaCode": "L-0485CB21",
                "QuotaName": "Stack count",
                "Value": 200.0,
                "Unit": "None",
                "Adjustable": true,
                "GlobalQuota": false
            }
        ]
    }
