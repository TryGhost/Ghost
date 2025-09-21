**To describe your route tables**

The following ``describe-route-tables`` example retrieves the details about your route tables ::

    aws ec2 describe-route-tables

Output::

    {
        "RouteTables": [
            {
                "Associations": [
                    {
                        "Main": true,
                        "RouteTableAssociationId": "rtbassoc-0df3f54e06EXAMPLE",
                        "RouteTableId": "rtb-09ba434c1bEXAMPLE"
                    }
                ],
                "PropagatingVgws": [],
                "RouteTableId": "rtb-09ba434c1bEXAMPLE",
                "Routes": [
                    {
                        "DestinationCidrBlock": "10.0.0.0/16",
                        "GatewayId": "local",
                        "Origin": "CreateRouteTable",
                        "State": "active"
                    },
                    {
                        "DestinationCidrBlock": "0.0.0.0/0",
                        "NatGatewayId": "nat-06c018cbd8EXAMPLE",
                        "Origin": "CreateRoute",
                        "State": "blackhole"
                    }
                ],
                "Tags": [],
                "VpcId": "vpc-0065acced4EXAMPLE",
                "OwnerId": "111122223333"
            },
            {
                "Associations": [
                    {
                        "Main": true,
                        "RouteTableAssociationId": "rtbassoc-9EXAMPLE",
                        "RouteTableId": "rtb-a1eec7de"
                    }
                ],
                "PropagatingVgws": [],
                "RouteTableId": "rtb-a1eec7de",
                "Routes": [
                    {
                        "DestinationCidrBlock": "172.31.0.0/16",
                        "GatewayId": "local",
                        "Origin": "CreateRouteTable",
                        "State": "active"
                    },
                    {
                        "DestinationCidrBlock": "0.0.0.0/0",
                        "GatewayId": "igw-fEXAMPLE",
                        "Origin": "CreateRoute",
                        "State": "active"
                    }
                ],
                "Tags": [],
                "VpcId": "vpc-3EXAMPLE",
                "OwnerId": "111122223333"
            },
            {
                "Associations": [
                    {
                        "Main": false,
                        "RouteTableAssociationId": "rtbassoc-0b100c28b2EXAMPLE",
                        "RouteTableId": "rtb-07a98f76e5EXAMPLE",
                        "SubnetId": "subnet-0d3d002af8EXAMPLE"
                    }
                ],
                "PropagatingVgws": [],
                "RouteTableId": "rtb-07a98f76e5EXAMPLE",
                "Routes": [
                    {
                        "DestinationCidrBlock": "10.0.0.0/16",
                        "GatewayId": "local",
                        "Origin": "CreateRouteTable",
                        "State": "active"
                    },
                    {
                        "DestinationCidrBlock": "0.0.0.0/0",
                        "GatewayId": "igw-06cf664d80EXAMPLE",
                        "Origin": "CreateRoute",
                        "State": "active"
                    }
                ],
                "Tags": [],
                "VpcId": "vpc-0065acced4EXAMPLE",
                "OwnerId": "111122223333"
            }
        ]
    }

For more information, see `Working with Route Tables <https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html#WorkWithRouteTables>`__ in the *AWS VPC User Guide*.
