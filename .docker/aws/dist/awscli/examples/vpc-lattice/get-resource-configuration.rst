**To get information about a resource configuration**

The following ``get-resource-configuration`` example gets information about the specified resource configuration. ::

    aws vpc-lattice get-resource-configuration \
        --resource-configuration-identifier rcfg-07129f3acded87625

Output::

    {
        "allowAssociationToShareableServiceNetwork": true,
        "amazonManaged": false,
        "arn": "arn:aws:vpc-lattice:us-east-1:123456789012:resourceconfiguration/rcfg-07129f3acded87625",
        "createdAt": "2025-02-01T00:57:35.871000+00:00",
        "id": "rcfg-07129f3acded87625",
        "lastUpdatedAt": "2025-02-01T00:57:46.874000+00:00",
        "name": "my-resource-config",
        "portRanges": [
            "1-65535"
        ],
        "protocol": "TCP",
        "resourceConfigurationDefinition": {
            "ipResource": {
                "ipAddress": "10.0.14.85"
            }
        },
        "resourceGatewayId": "rgw-0bba03f3d56060135",
        "status": "ACTIVE",
        "type": "SINGLE"
    }

For more information, see `Resource gateways in VPC Lattice <https://docs.aws.amazon.com/vpc-lattice/latest/ug/resource-configuration.html>`__ in the *Amazon VPC Lattice User Guide*.
