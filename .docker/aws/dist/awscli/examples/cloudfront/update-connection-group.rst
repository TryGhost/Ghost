**To update a CloudFront connection group**

The following ``update-connection-group`` example disables a CloudFront connection group and disables IPv6. ::

    aws cloudfront update-connection-group \
        --id cg_2yHsDkcPKeUlVkk3aEgLKcjABC \
        --no-ipv6-enabled \
        --no-enabled \
        --if-match E3UN6WX5RRO2ABC

Output::

    {
        "ETag": "E1F83G8C2ARABC",
        "ConnectionGroup": {
            "Id": "cg_2yHsDkcPKeUlVkk3aEgLKcjABC",
            "Name": "cg-example",
            "Arn": "arn:aws:cloudfront::123456789012:connection-group/cg_2yHsDkcPKeUlVkk3aEgLKcjABC",
            "CreatedTime": "2025-06-09T20:58:35.481000+00:00",
            "LastModifiedTime": "2025-06-11T16:25:54.280000+00:00",
            "Ipv6Enabled": false,
            "RoutingEndpoint": "du9xp1elo1abc.cloudfront.net",
            "Status": "InProgress",
            "Enabled": false,
            "IsDefault": false
        }
    }

For more information, see `Create custom connection group (optional) <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-connection-group.html>`__ in the *Amazon CloudFront Developer Guide*.