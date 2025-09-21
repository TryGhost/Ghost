**To describe a service quota increase request**

The following ``get-requested-service-quota-change`` example describes the specified quota increase request. ::

    aws service-quotas get-requested-service-quota-change \
        --request-id d187537d15254312a9609aa51bbf7624u7W49tPO

Output::

    {
        "RequestedQuota": {
            "Id": "d187537d15254312a9609aa51bbf7624u7W49tPO",
            "CaseId": "6780195351",
            "ServiceCode": "ec2",
            "ServiceName": "Amazon Elastic Compute Cloud (Amazon EC2)",
            "QuotaCode": "L-20F13EBD",
            "QuotaName": "Running Dedicated c5n Hosts",
            "DesiredValue": 2.0,
            "Status": "CASE_OPENED",
            "Created": 1580446904.067,
            "LastUpdated": 1580446953.265,
            "Requester": "{\"accountId\":\"123456789012\",\"callerArn\":\"arn:aws:iam::123456789012:root\"}",
            "QuotaArn": "arn:aws:servicequotas:us-east-2:123456789012:ec2/L-20F13EBD",
            "GlobalQuota": false,
            "Unit": "None"
        }
    }
