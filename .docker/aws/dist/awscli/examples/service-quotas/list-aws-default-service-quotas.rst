**To list the default quotas for a service**

The following ``list-aws-default-service-quotas`` example lists the default values for the quotas for the specified service. ::

    aws service-quotas list-aws-default-service-quotas \
        --service-code xray

Output::

    {
        "Quotas": [
            {
                "ServiceCode": "xray",
                "ServiceName": "AWS X-Ray",
                "QuotaArn": "arn:aws:servicequotas:us-west-2::xray/L-C6B6F05D",
                "QuotaCode": "L-C6B6F05D",
                "QuotaName": "Indexed annotations per trace",
                "Value": 50.0,
                "Unit": "None",
                "Adjustable": false,
                "GlobalQuota": false
            },
            {
                "ServiceCode": "xray",
                "ServiceName": "AWS X-Ray",
                "QuotaArn": "arn:aws:servicequotas:us-west-2::xray/L-D781C0FD",
                "QuotaCode": "L-D781C0FD",
                "QuotaName": "Segment document size",
                "Value": 64.0,
                "Unit": "Kilobytes",
                "Adjustable": false,
                "GlobalQuota": false
            },
            {
                "ServiceCode": "xray",
                "ServiceName": "AWS X-Ray",
                "QuotaArn": "arn:aws:servicequotas:us-west-2::xray/L-998BFF16",
                "QuotaCode": "L-998BFF16",
                "QuotaName": "Trace and service graph retention in days",
                "Value": 30.0,
                "Unit": "None",
                "Adjustable": false,
                "GlobalQuota": false
            }
        ]
    }
