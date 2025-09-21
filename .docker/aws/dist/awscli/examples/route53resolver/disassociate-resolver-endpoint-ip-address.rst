**To disassociate an IP address from a Resolver endpoint**

The following ``disassociate-resolver-endpoint-ip-address`` example removes an IP address from a specified Resolver inbound or outbound endpoint. 

**Note** An endpoint must have at least two IP addresses. If an endpoint currently has only two IP addresses and you want to replace one address with another address, you must first use `associate-resolver-endpoint-ip-address <https://docs.aws.amazon.com/cli/latest/reference/route53resolver/associate-resolver-endpoint-ip-address.html>`__ to associate the new IP address. Then you can disassociate one of the original IP addresses from the endpoint. ::

    aws route53resolver disassociate-resolver-endpoint-ip-address \
        --resolver-endpoint-id rslvr-in-f9ab8a03f1example \
        --ip-address="SubnetId=subnet-12d8a459,Ip=172.31.40.121" 

Output::

    {
        "ResolverEndpoint": {
            "Id": "rslvr-in-f9ab8a03f1example",
            "CreatorRequestId": "2020-01-01-18:47",
            "Arn": "arn:aws:route53resolver:us-west-2:111122223333:resolver-endpoint/rslvr-in-f9ab8a03f1example",
            "Name": "my-inbound-endpoint",
            "SecurityGroupIds": [
                "sg-f62bexam"
            ],
            "Direction": "INBOUND",
            "IpAddressCount": 3,
            "HostVPCId": "vpc-304bexam",
            "Status": "UPDATING",
            "StatusMessage": "Updating the Resolver Endpoint",
            "CreationTime": "2020-01-01T23:02:29.583Z",
            "ModificationTime": "2020-01-05T23:02:29.583Z"
        }
    }
