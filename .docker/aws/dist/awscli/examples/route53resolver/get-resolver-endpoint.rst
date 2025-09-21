**To get information about a Resolver endpoint**

The following ``get-resolver-endpoint`` example displays details for the outbound specified endpoint. You can use ``get-resolver-endpoint`` for both inbound and outbound endpoints by specifying the applicable endpoint ID. ::

    aws route53resolver get-resolver-endpoint \
        --resolver-endpoint-id rslvr-out-d5e5920e37example

Output::

    {
        "ResolverEndpoint": {
            "Id": "rslvr-out-d5e5920e37example",
            "CreatorRequestId": "2020-01-01-18:47",
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
            "ModificationTime": "2020-01-02T23:50:50.979Z"
        }
    }

For more information, see `Values That You Specify When You Create or Edit Inbound Endpoints <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-inbound-queries.html#resolver-forwarding-inbound-queries-values>`__ in the *Amazon Route 53 Developer Guide*.
