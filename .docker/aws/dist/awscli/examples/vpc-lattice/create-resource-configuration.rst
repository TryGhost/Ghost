**To create a resource configuration**

The following ``create-resource-configuration`` example creates a resource configuration that specifies a single IPv4 address. ::

    aws vpc-lattice create-resource-configuration \
        --name my-resource-config \
        --type SINGLE \
        --resource-gateway-identifier rgw-0bba03f3d56060135 \
        --resource-configuration-definition 'ipResource={ipAddress=10.0.14.85}'

Output::

    {
        "allowAssociationToShareableServiceNetwork": true,
        "arn": "arn:aws:vpc-lattice:us-east-1:123456789012:resourceconfiguration/rcfg-07129f3acded87625",
        "id": "rcfg-07129f3acded87625",
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

For more information, see `Resource configurations for VPC resources <https://docs.aws.amazon.com/vpc-lattice/latest/ug/resource-configuration.html>`__ in the *Amazon VPC Lattice User Guide*.
