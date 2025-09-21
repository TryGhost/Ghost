**Example 1: To create an Internet-facing load balancer**

The following ``create-load-balancer`` example creates an Internet-facing Application Load Balancer and enables the Availability Zones for the specified subnets. ::

    aws elbv2 create-load-balancer \
        --name my-load-balancer \
        --subnets subnet-b7d581c0 subnet-8360a9e7

Output::

    {
        "LoadBalancers": [
            {
                "Type": "application",
                "Scheme": "internet-facing",
                "IpAddressType": "ipv4",
                "VpcId": "vpc-3ac0fb5f",
                "AvailabilityZones": [
                    {
                        "ZoneName": "us-west-2a",
                        "SubnetId": "subnet-8360a9e7"
                    },
                    {
                        "ZoneName": "us-west-2b",
                        "SubnetId": "subnet-b7d581c0"
                    }
                ],
                "CreatedTime": "2017-08-25T21:26:12.920Z",
                "CanonicalHostedZoneId": "Z2P70J7EXAMPLE",
                "DNSName": "my-load-balancer-424835706.us-west-2.elb.amazonaws.com",
                "SecurityGroups": [
                    "sg-5943793c"
                ],
                "LoadBalancerName": "my-load-balancer",
                "State": {
                    "Code": "provisioning"
                },
                "LoadBalancerArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188"
            }
        ]
    }

For more information, see `Tutorial: Create an Application Load Balancer using the AWS CLI <https://docs.aws.amazon.com/elasticloadbalancing/latest/application/tutorial-application-load-balancer-cli.html>`__ in the *User Guide for Application Load Balancers*.

**Example 2: To create an internal load balancer**

The following ``create-load-balancer`` example creates an internal Application Load Balancer and enables the Availability Zones for the specified subnets. ::

    aws elbv2 create-load-balancer \
        --name my-internal-load-balancer \
        --scheme internal \
        --subnets subnet-b7d581c0 subnet-8360a9e7

Output::

    {
        "LoadBalancers": [
            {
                "Type": "application",
                "Scheme": "internal",
                "IpAddressType": "ipv4",
                "VpcId": "vpc-3ac0fb5f",
                "AvailabilityZones": [
                    {
                        "ZoneName": "us-west-2a",
                        "SubnetId": "subnet-8360a9e7"
                    },
                    {
                        "ZoneName": "us-west-2b",
                        "SubnetId": "subnet-b7d581c0"
                    }
                ],
                "CreatedTime": "2016-03-25T21:29:48.850Z",
                "CanonicalHostedZoneId": "Z2P70J7EXAMPLE",
                "DNSName": "internal-my-internal-load-balancer-1529930873.us-west-2.elb.amazonaws.com",
                "SecurityGroups": [
                    "sg-5943793c"
                ],
                "LoadBalancerName": "my-internal-load-balancer",
                "State": {
                    "Code": "provisioning"
                },
                "LoadBalancerArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-internal-load-balancer/5b49b8d4303115c2"
            }
        ]
    }

For more information, see `Tutorial: Create an Application Load Balancer using the AWS CLI <https://docs.aws.amazon.com/elasticloadbalancing/latest/application/tutorial-application-load-balancer-cli.html>`__ in the *User Guide for Application Load Balancers*.

**Example 3: To create a Network Load Balancer**

The following ``create-load-balancer`` example creates an Internet-facing Network Load Balancer and enables the Availability Zone for the specified subnet. It uses a subnet mapping to associate the specified Elastic IP address with the network interface used by the load balancer nodes for the Availability Zone. ::

    aws elbv2 create-load-balancer \
        --name my-network-load-balancer \
        --type network \
        --subnet-mappings SubnetId=subnet-b7d581c0,AllocationId=eipalloc-64d5890a

Output::

    {
        "LoadBalancers": [
            {
                "Type": "network",
                "Scheme": "internet-facing",
                "IpAddressType": "ipv4",
                "VpcId": "vpc-3ac0fb5f",
                "AvailabilityZones": [
                    {
                        "LoadBalancerAddresses": [
                            {
                                "IpAddress": "35.161.207.171",
                                "AllocationId": "eipalloc-64d5890a"
                            }
                        ],
                        "ZoneName": "us-west-2b",
                        "SubnetId": "subnet-5264e837"
                    }
                ],
                "CreatedTime": "2017-10-15T22:41:25.657Z",
                "CanonicalHostedZoneId": "Z2P70J7EXAMPLE",
                "DNSName": "my-network-load-balancer-5d1b75f4f1cee11e.elb.us-west-2.amazonaws.com",
                "LoadBalancerName": "my-network-load-balancer",
                "State": {
                    "Code": "provisioning"
                },
                "LoadBalancerArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/net/my-network-load-balancer/5d1b75f4f1cee11e"
            }
        ]
    }

For more information, see `Tutorial: Create a Network Load Balancer using the AWS CLI <https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancer-cli.html>`__ in the *User Guide for Network Load Balancers*.

**Example 4: To create a Gateway Load Balancer**

The following ``create-load-balancer`` example creates a Gateway Load Balancer and enables the Availability Zones for the specified subnets. ::

    aws elbv2 create-load-balancer \
        --name my-gateway-load-balancer \
        --type gateway \
        --subnets subnet-dc83f691 subnet-a62583f9

Output::

    {
        "LoadBalancers": [
            {
                "Type": "gateway",
                "VpcId": "vpc-838475fe",
                "AvailabilityZones": [
                    {
                        "ZoneName": "us-east-1b",
                        "SubnetId": "subnet-a62583f9"
                    },
                {
                        "ZoneName": "us-east-1a",
                        "SubnetId": "subnet-dc83f691"
                    }
                ],
                "CreatedTime": "2021-07-14T19:33:43.324000+00:00",
                "LoadBalancerName": "my-gateway-load-balancer",
                "State": {
                    "Code": "provisioning"
                },
                "LoadBalancerArn": "arn:aws:elasticloadbalancing:us-east-1:850631746142:loadbalancer/gwy/my-gateway-load-balancer/dfbb5a7d32cdee79"
            }
        ]
    }

For more information, see `Getting started with Gateway Load Balancers using the AWS CLI <https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/getting-started-cli.html>`__ in the *User Guide for Gateway Load Balancers*.