**To list connection groups**

The following ``list-connection-groups`` example lists the available connection groups in your AWS account. ::

    aws cloudfront list-connection-groups

Output::

    {
        "ConnectionGroups": [
            {
                "Id": "cg_2whCJoXMYCjHcxaLGrkllvyABC",
                "Name": "CreatedByCloudFront-cg_2whCJoXMYCjHcxaLGrkllvyABC",
                "Arn": "arn:aws:cloudfront::123456789012:connection-group/cg_2whCJoXMYCjHcxaLGrkllvyABC",
                "RoutingEndpoint": "d3sx0pso7m5abc.cloudfront.net",
                "CreatedTime": "2025-05-05T22:32:29.630000+00:00",
                "LastModifiedTime": "2025-05-05T22:32:29.630000+00:00",
                "ETag": "E23ZP02F085ABC",
                "Enabled": true,
                "Status": "Deployed",
                "IsDefault": true
            },
            {
                "Id": "cg_2wjDWTBKTlRB87cAaUQFaakABC",
                "Name": "connection-group-2",
                "Arn": "arn:aws:cloudfront::123456789012:connection-group/cg_2wjDWTBKTlRB87cAaUQFaakABC",
                "RoutingEndpoint": "dvdg9gprgabc.cloudfront.net",
                "CreatedTime": "2025-05-06T15:42:00.790000+00:00",
                "LastModifiedTime": "2025-05-06T15:42:00.790000+00:00",
                "ETag": "E23ZP02F085ABC",
                "Enabled": true,
                "Status": "Deployed",
                "IsDefault": false
            }
        ]
    }

For more information, see `Create custom connection group (optional) <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-connection-group.html>`__ in the *Amazon CloudFront Developer Guide*.
