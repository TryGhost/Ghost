**Example 1: To update settings Resolver endpoint**

The following ``update-resolver-rule`` example updates the name of the rule, the IP addresses on your on-premises network that DNS queries are forwarded to, and the ID of the outbound Resolver endpoint that you're using to forward queries to your network. 

**Note** Existing values for ``TargetIps`` are overwritten, so you must specify all the IP addresses that you want the rule to have after the update. ::

    aws route53resolver update-resolver-rule \
        --resolver-rule-id rslvr-rr-1247fa64f3example \
        --config Name="my-2nd-rule",TargetIps=[{Ip=192.0.2.45,Port=53},{Ip=192.0.2.46,Port=53}],ResolverEndpointId=rslvr-out-7b89ed0d25example

Output::

    {
        "ResolverRule": {
            "Id": "rslvr-rr-1247fa64f3example",
            "CreatorRequestId": "2020-01-02-18:47",
            "Arn": "arn:aws:route53resolver:us-west-2:111122223333:resolver-rule/rslvr-rr-1247fa64f3example",
            "DomainName": "www.example.com.",
            "Status": "COMPLETE",
            "StatusMessage": "[Trace id: 1-5dcc90b9-8a8ee860aba1ebd89example] Successfully updated Resolver Rule.",
            "RuleType": "FORWARD",
            "Name": "my-2nd-rule",
            "TargetIps": [
                {
                    "Ip": "192.0.2.45",
                    "Port": 53
                },
                {
                    "Ip": "192.0.2.46",
                    "Port": 53
                }
            ],
            "ResolverEndpointId": "rslvr-out-7b89ed0d25example",
            "OwnerId": "111122223333",
            "ShareStatus": "NOT_SHARED"
        }
    }

**Example 2: To update settings Resolver endpoint using a file for ``config`` settings**

You can alternatively include the ``config`` settings in a JSON file and then specify that file when you call ``update-resolver-rule``. ::

    aws route53resolver update-resolver-rule \
        --resolver-rule-id rslvr-rr-1247fa64f3example \
        --config file://c:\temp\update-resolver-rule.json

Contents of ``update-resolver-rule.json``. ::

    {
        "Name": "my-2nd-rule",
        "TargetIps": [
            {
                "Ip": "192.0.2.45",
                "Port": 53
            },
            {
                "Ip": "192.0.2.46",
                "Port": 53
            }
        ],
        "ResolverEndpointId": "rslvr-out-7b89ed0d25example"
    }

For more information, see `Values That You Specify When You Create or Edit Rules <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-outbound-queries.html#resolver-forwarding-outbound-queries-rule-values>`__ in the *Amazon Route 53 Developer Guide*.
