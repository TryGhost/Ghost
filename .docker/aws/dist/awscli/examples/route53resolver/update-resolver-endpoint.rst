**To update the name of a Resolver endpoint**

The following ``update-resolver-endpoint`` example updates the name of a Resolver endpoint. Updating other values isn't supported. ::

    aws route53resolver update-resolver-endpoint \ 
        --resolver-endpoint-id rslvr-in-b5d45e32bdc445f09 \
        --name my-renamed-inbound-endpoint

Output::

    {
        "ResolverEndpoint": {
            "Id": "rslvr-in-b5d45e32bdexample",
            "CreatorRequestId": "2020-01-02-18:48",
            "Arn": "arn:aws:route53resolver:us-west-2:111122223333:resolver-endpoint/rslvr-in-b5d45e32bdexample",
            "Name": "my-renamed-inbound-endpoint",
            "SecurityGroupIds": [
                "sg-f62bexam"
            ],
            "Direction": "INBOUND",
            "IpAddressCount": 2,
            "HostVPCId": "vpc-304bexam",
            "Status": "OPERATIONAL",
            "StatusMessage": "This Resolver Endpoint is operational.",
            "CreationTime": "2020-01-01T18:33:59.265Z",
            "ModificationTime": "2020-01-08T18:33:59.265Z"
        }
    }
