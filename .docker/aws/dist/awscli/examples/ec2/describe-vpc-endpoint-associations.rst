**To describe VPC endpoint associations**

The following ``describe-vpc-endpoint-associations`` example describes your VPC endpoint associations. ::

    aws ec2 describe-vpc-endpoint-associations

Output::

    {
        "VpcEndpointAssociations": [
            {
                "Id": "vpce-rsc-asc-0a810ca6ac8866bf9",
                "VpcEndpointId": "vpce-019b90d6f16d4f958",
                "AssociatedResourceAccessibility": "Accessible",
                "DnsEntry": {
                    "DnsName": "vpce-019b90d6f16d4f958.rcfg-07129f3acded87625.4232ccc.vpc-lattice-rsc.us-east-2.on.aws",
                    "HostedZoneId": "Z03265862FOUNWMZOKUF4"
                },
                "AssociatedResourceArn": "arn:aws:vpc-lattice:us-east-1:123456789012:resourceconfiguration/rcfg-07129f3acded87625"
            }
        ]
    }

For more information, see `Manage VPC endpoint associations <https://docs.aws.amazon.com/vpc/latest/privatelink/resource-configuration-associations.html#resource-config-manage-ep-association>`__ in the *AWS PrivateLink User Guide*.
