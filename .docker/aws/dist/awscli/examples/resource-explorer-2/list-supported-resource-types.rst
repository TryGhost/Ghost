**To list the AWS Regions where Resource Explorer has indexes**

The following ``list-supported-resource-types`` example lists all of the resource types currently supported by &AREXlong;. The example response includes a ``NextToken`` value, which indicates that there is more output available to retrieve with additional calls. ::

    aws resource-explorer-2 list-supported-resource-types \
        --max-items 10

Output::

    {
        "ResourceTypes": [
            {
                "ResourceType": "cloudfront:cache-policy",
                "Service": "cloudfront"
            },
            {
                "ResourceType": "cloudfront:distribution",
                "Service": "cloudfront"
            },
            {
                "ResourceType": "cloudfront:function",
                "Service": "cloudfront"
            },
            {
                "ResourceType": "cloudfront:origin-access-identity",
                "Service": "cloudfront"
            },
            {
                "ResourceType": "cloudfront:origin-request-policy",
                "Service": "cloudfront"
            },
            {
                "ResourceType": "cloudfront:realtime-log-config",
                "Service": "cloudfront"
            },
            {
                "ResourceType": "cloudfront:response-headers-policy",
                "Service": "cloudfront"
            },
            {
                "ResourceType": "cloudwatch:alarm",
                "Service": "cloudwatch"
            },
            {
                "ResourceType": "cloudwatch:dashboard",
                "Service": "cloudwatch"
            },
            {
                "ResourceType": "cloudwatch:insight-rule",
                "Service": "cloudwatch"
            }
        ],
        "NextToken": "eyJOZXh0VG9rZW4iOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAxMH0="
    }

To get the next part of the output, call the operation again, and pass the previous call's ``NextToken`` response value as the value for ``--starting-token``. Repeat until ``NextToken`` is absent from the response. ::

    aws resource-explorer-2 list-supported-resource-types \
        --max-items 10  \
        --starting-token eyJOZXh0VG9rZW4iOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAxMH0=

Output::

    {
        "ResourceTypes": [
            {
                "ResourceType": "cloudwatch:metric-stream",
                "Service": "cloudwatch"
            },
            {
                "ResourceType": "dynamodb:table",
                "Service": "dynamodb"
            },
            {
                "ResourceType": "ec2:capacity-reservation",
                "Service": "ec2"
            },
            {
                "ResourceType": "ec2:capacity-reservation-fleet",
                "Service": "ec2"
            },
            {
                "ResourceType": "ec2:client-vpn-endpoint",
                "Service": "ec2"
            },
            {
                "ResourceType": "ec2:customer-gateway",
                "Service": "ec2"
            },
            {
                "ResourceType": "ec2:dedicated-host",
                "Service": "ec2"
            },
            {
                "ResourceType": "ec2:dhcp-options",
                "Service": "ec2"
            },
            {
                "ResourceType": "ec2:egress-only-internet-gateway",
                "Service": "ec2"
            },
            {
                "ResourceType": "ec2:elastic-gpu",
                "Service": "ec2"
            }
        ],
        "NextToken": "eyJOZXh0VG9rZW4iOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAyMH0="
    }

For more information about indexes, see `Checking which AWS Regions have Resource Explorer turned on <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-service-check.html>`__ in the *AWS Resource Explorer Users Guide*.