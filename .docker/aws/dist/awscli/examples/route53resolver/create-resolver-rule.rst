**To create a Resolver rule**

The following ``create-resolver-rule`` example creates a Resolver forwarding rule. The rule uses the outbound endpoint rslvr-out-d5e5920e37example to forward DNS queries for ``example.com`` to the IP addresses 10.24.8.75 and 10.24.8.156. ::

    aws route53resolver create-resolver-rule \
        --creator-request-id 2020-01-02-18:47 \
        --domain-name example.com \
        --name my-rule \
        --resolver-endpoint-id rslvr-out-d5e5920e37example \
        --rule-type FORWARD \
        --target-ips "Ip=10.24.8.75" "Ip=10.24.8.156"

Output::

    {
        "ResolverRule": {
            "Status": "COMPLETE", 
            "RuleType": "FORWARD", 
            "ResolverEndpointId": "rslvr-out-d5e5920e37example", 
            "Name": "my-rule", 
            "DomainName": "example.com.", 
            "CreationTime": "2022-05-10T21:35:30.923187Z", 
            "TargetIps": [
                {
                    "Ip": "10.24.8.75", 
                    "Port": 53
                }, 
                {
                    "Ip": "10.24.8.156", 
                    "Port": 53
                }
            ], 
            "CreatorRequestId": "2022-05-10-16:33", 
            "ModificationTime": "2022-05-10T21:35:30.923187Z", 
            "ShareStatus": "NOT_SHARED", 
            "Arn": "arn:aws:route53resolver:us-east-1:111117012054:resolver-rule/rslvr-rr-b1e0b905e93611111", 
            "OwnerId": "111111111111", 
            "Id": "rslvr-rr-rslvr-rr-b1e0b905e93611111", 
            "StatusMessage": "[Trace id: 1-22222222-3e56afcc71a3724664f22e24] Successfully created Resolver Rule."
        }
    }