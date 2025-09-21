**To retrieve the details of the AWS Shield Advanced protection for the account**

The following ``describe-subscription`` example displays details about the Shield Advanced protection provided for the account.::

    aws shield describe-subscription

Output::

    {
        "Subscription": {
            "StartTime": 1534368978.0,
            "EndTime": 1597613778.0,
            "TimeCommitmentInSeconds": 63244800,
            "AutoRenew": "ENABLED",
            "Limits": [
                {
                    "Type": "GLOBAL_ACCELERATOR",
                    "Max": 1000
                },
                {
                    "Type": "ROUTE53_HOSTED_ZONE",
                    "Max": 1000
                },
                {
                    "Type": "CF_DISTRIBUTION",
                    "Max": 1000
                },
                {
                    "Type": "ELB_LOAD_BALANCER",
                    "Max": 1000
                },
                {
                    "Type": "EC2_ELASTIC_IP_ALLOCATION",
                    "Max": 1000
                }
            ]
        }
    }

For more information, see `How AWS Shield Works <https://docs.aws.amazon.com/waf/latest/developerguide/ddos-overview.html>`__ in the *AWS Shield Advanced Developer Guide*.