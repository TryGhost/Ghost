**To describe a default service quota**

The following ``get-aws-default-service-quota`` example displays details for the specified quota. ::

    aws service-quotas get-aws-default-service-quota \
        --service-code ec2 \
        --quota-code L-1216C47A

Output::

    {
        "Quota": {
            "ServiceCode": "ec2",
            "ServiceName": "Amazon Elastic Compute Cloud (Amazon EC2)",
            "QuotaArn": "arn:aws:servicequotas:us-east-2::ec2/L-1216C47A",
            "QuotaCode": "L-1216C47A",
            "QuotaName": "Running On-Demand Standard (A, C, D, H, I, M, R, T, Z) instances",
            "Value": 5.0,
            "Unit": "None",
            "Adjustable": true,
            "GlobalQuota": false,
            "UsageMetric": {
                "MetricNamespace": "AWS/Usage",
                "MetricName": "ResourceCount",
                "MetricDimensions": {
                    "Class": "Standard/OnDemand",
                    "Resource": "vCPU",
                    "Service": "EC2",
                    "Type": "Resource"
                },
                "MetricStatisticRecommendation": "Maximum"
            }
        }
    }
