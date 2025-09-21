**To request a service quota increase**

The following ``request-service-quota-increase`` example requests an increase in the specified service quota. ::

    aws service-quotas request-service-quota-increase \
        --service-code ec2 \
        --quota-code L-20F13EBD \
        --desired-value 2

Output::

    {
        "RequestedQuota": {
            "Id": "d187537d15254312a9609aa51bbf7624u7W49tPO",
            "ServiceCode": "ec2",
            "ServiceName": "Amazon Elastic Compute Cloud (Amazon EC2)",
            "QuotaCode": "L-20F13EBD",
            "QuotaName": "Running Dedicated c5n Hosts",
            "DesiredValue": 2.0,
            "Status": "PENDING",
            "Created": 1580446904.067,
            "Requester": "{\"accountId\":\"123456789012\",\"callerArn\":\"arn:aws:iam::123456789012:root\"}",
            "QuotaArn": "arn:aws:servicequotas:us-east-2:123456789012:ec2/L-20F13EBD",
            "GlobalQuota": false,
            "Unit": "None"
        }
    }
