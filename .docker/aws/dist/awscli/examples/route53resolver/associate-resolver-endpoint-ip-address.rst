**To associate another IP address with a Resolver endpoint**

The following ``associate-resolver-endpoint-ip-address`` example associates another IP address with an inbound Resolver endpoint. If you specify only a subnet ID and omit the IP address from the ``--ip-address`` parameter, Resolver chooses an IP address for you from among the available IP addresses in the specified subnet. ::

    aws route53resolver associate-resolver-endpoint-ip-address \
        --resolver-endpoint-id rslvr-in-497098ad5example \ 
        --ip-address="SubnetId=subnet-12d8exam,Ip=192.0.2.118"

Output::

    {
        "ResolverEndpoint": {
            "Id": "rslvr-in-497098ad5example",
            "CreatorRequestId": "AWSConsole.25.0123456789",
            "Arn": "arn:aws:route53resolver:us-west-2:111122223333:resolver-endpoint/rslvr-in-497098ad5example",
            "Name": "my-inbound-endpoint",
            "SecurityGroupIds": [
                "sg-05cd7b25d6example"
            ],
            "Direction": "INBOUND",
            "IpAddressCount": 3,
            "HostVPCId": "vpc-304bexam",
            "Status": "UPDATING",
            "StatusMessage": "Updating the Resolver Endpoint",
            "CreationTime": "2020-01-02T23:25:45.538Z",
            "ModificationTime": "2020-01-02T23:25:45.538Z"
        }
    }

For more information, see `Values That You Specify When You Create or Edit Inbound Endpoints <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-inbound-queries.html#resolver-forwarding-inbound-queries-values>`__ in the *Amazon Route 53 Developer Guide*.
