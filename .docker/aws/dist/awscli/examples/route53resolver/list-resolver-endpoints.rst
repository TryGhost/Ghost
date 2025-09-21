**To list Resolver endpoints in an AWS Region**

The following ``list-resolver-endpoints`` example lists the inbound and outbound Resolver endpoints that exist in the current account. ::

    aws route53resolver list-resolver-endpoints

Output::

    {
        "MaxResults": 10,
        "ResolverEndpoints": [
            {
                "Id": "rslvr-in-497098ad59example",
                "CreatorRequestId": "2020-01-01-18:47",
                "Arn": "arn:aws:route53resolver:us-west-2:111122223333:resolver-endpoint/rslvr-in-497098ad59example",
                "Name": "my-inbound-endpoint",
                "SecurityGroupIds": [
                    "sg-05cd7b25d6example"
                ],
                "Direction": "INBOUND",
                "IpAddressCount": 2,
                "HostVPCId": "vpc-304bexam",
                "Status": "OPERATIONAL",
                "StatusMessage": "This Resolver Endpoint is operational.",
                "CreationTime": "2020-01-01T23:25:45.538Z",
                "ModificationTime": "2020-01-01T23:25:45.538Z"
            },
            {
                "Id": "rslvr-out-d5e5920e37example",
                "CreatorRequestId": "2020-01-01-18:48",
                "Arn": "arn:aws:route53resolver:us-west-2:111122223333:resolver-endpoint/rslvr-out-d5e5920e37example",
                "Name": "my-outbound-endpoint",
                "SecurityGroupIds": [
                    "sg-05cd7b25d6example"
                ],
                "Direction": "OUTBOUND",
                "IpAddressCount": 2,
                "HostVPCId": "vpc-304bexam",
                "Status": "OPERATIONAL",
                "StatusMessage": "This Resolver Endpoint is operational.",
                "CreationTime": "2020-01-01T23:50:50.979Z",
                "ModificationTime": "2020-01-01T23:50:50.979Z"
            }
        ]
    }

