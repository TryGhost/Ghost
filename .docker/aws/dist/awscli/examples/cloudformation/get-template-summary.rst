**To display a template summary**

The following command displays summary information about the resources and metadata for the specified template file. ::

	aws cloudformation get-template-summary \
	   --template-body file://template.yaml

Output::

    {
        "Parameters": [],
        "Description": "A VPC and subnets.",
        "ResourceTypes": [
            "AWS::EC2::VPC",
            "AWS::EC2::Subnet",
            "AWS::EC2::Subnet",
            "AWS::EC2::RouteTable",
            "AWS::EC2::VPCEndpoint",
            "AWS::EC2::SubnetRouteTableAssociation",
            "AWS::EC2::SubnetRouteTableAssociation",
            "AWS::EC2::VPCEndpoint"
        ],
        "Version": "2010-09-09"
    }
