**To create a connection group in CloudFront**

The following ``create-connection-group`` example creates an enabled connection group, specifies an Anycast static IP list, and disables IPv6. ::

    aws cloudfront create-connection-group \
        --name cg-with-anycast-ip-list \
        --no-ipv6-enabled \
        --enabled \
        --anycast-ip-list-id aip_CCkW6gKrDiBD4n78123ABC \
        --tags "Items=[{Key=abc,Value=123}]"

Output::

    {
        "ETag": "E23ZP02F085ABC",
        "ConnectionGroup": {
            "Id": "cg_2yb6uj74B4PCbfhT31WFdiSABC",
            "Name": "cg-with-anycast-ip-list",
            "Arn": "arn:aws:cloudfront::123456789012:connection-group/cg_2yb6uj74B4PCbfhT31WFdiSABC",
            "CreatedTime": "2025-06-16T16:25:50.061000+00:00",
            "LastModifiedTime": "2025-06-16T16:25:50.061000+00:00",
            "Tags": {
                "Items": [
                    {
                        "Key": "abc",
                        "Value": "123"
                    }
                ]
            },
            "Ipv6Enabled": false,
            "RoutingEndpoint": "dj6xusxq65abc.cloudfront.net",
            "AnycastIpListId": "aip_CCkW6gKrDiBD4n78123ABC",
            "Status": "InProgress",
            "Enabled": true,
            "IsDefault": false
        }
    }

For more information, see `Create custom connection group (optional) <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-connection-group.html>`__ in the *Amazon CloudFront Developer Guide*.
