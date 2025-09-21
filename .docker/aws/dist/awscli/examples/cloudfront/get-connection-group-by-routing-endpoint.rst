**To get a connection group by routing endpoint**

The following ``get-connection-group-by-routing-endpoint`` example retrieves information about a connection group using its routing endpoint. ::

    aws cloudfront get-connection-group-by-routing-endpoint \
        --routing-endpoint dvdg9gprgabc.cloudfront.net

Output::

    {
        "ETag": "E23ZP02F085ABC",
        "ConnectionGroup": {
            "Id": "cg_2wjDWTBKTlRB87cAaUQFaakABC",
            "Name": "connection-group-2",
            "Arn": "arn:aws:cloudfront::123456789012:connection-group/cg_2wjDWTBKTlRB87cAaUQFaakABC",
            "CreatedTime": "2025-05-06T15:42:00.790000+00:00",
            "LastModifiedTime": "2025-05-06T15:42:00.790000+00:00",
            "Ipv6Enabled": true,
            "RoutingEndpoint": "dvdg9gprgabc.cloudfront.net",
            "Status": "Deployed",
            "Enabled": true,
            "IsDefault": false
        }
    }

For more information, see `Create custom connection group (optional) <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-connection-group.html>`__ in the *Amazon CloudFront Developer Guide*.
