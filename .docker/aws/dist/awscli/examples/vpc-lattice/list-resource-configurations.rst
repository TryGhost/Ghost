**To list your resource configurations**

The following ``list-resource-configurations`` example lists your resource configurations. ::

    aws vpc-lattice list-resource-configurations 

Output::

    {
        "items": [
            {
                "amazonManaged": false,
                "arn": "arn:aws:vpc-lattice:us-east-1:123456789012:resourceconfiguration/rcfg-07129f3acded87625",
                "createdAt": "2025-02-01T00:57:35.871000+00:00",
                "id": "rcfg-07129f3acded87625",
                "lastUpdatedAt": "2025-02-01T00:57:46.874000+00:00",
                "name": "my-resource-config",
                "resourceGatewayId": "rgw-0bba03f3d56060135",
                "status": "ACTIVE",
                "type": "SINGLE"
            }
        ]
    }

For more information, see `Resource configurations <https://docs.aws.amazon.com/vpc-lattice/latest/ug/resource-configuration.html>`__ in the *Amazon VPC Lattice User Guide*.
