**To list the VPC endpoint associations**

The following ``list-resource-endpoint-associations`` example lists the VPC endpoints associated with the specified resource configuration. ::

    aws vpc-lattice list-resource-endpoint-associations \
        --resource-configuration-identifier rcfg-07129f3acded87625

Output::

    {
        "items": [
            {
                "arn": "arn:aws:vpc-lattice:us-east-1:123456789012:resourceendpointassociation/rea-0956a7435baf89326",
                "createdAt": "2025-02-01T00:57:38.998000+00:00",
                "id": "rea-0956a7435baf89326",
                "resourceConfigurationArn": "arn:aws:vpc-lattice:us-east-1:123456789012:resourceconfiguration/rcfg-07129f3acded87625",
                "resourceConfigurationId": "rcfg-07129f3acded87625",
                "vpcEndpointId": "vpce-019b90d6f16d4f958",
                "vpcEndpointOwner": "123456789012"
            }
        ]
    }

For more information, see `Manage associations for a VPC Lattice resource configuration <https://docs.aws.amazon.com/vpc-lattice/latest/ug/resource-configuration-associations.html>`__ in the *Amazon VPC Lattice User Guide*.
