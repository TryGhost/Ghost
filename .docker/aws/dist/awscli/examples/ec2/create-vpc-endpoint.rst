**Example 1: To create a gateway endpoint**

The following ``create-vpc-endpoint`` example creates a gateway VPC endpoint between VPC ``vpc-1a2b3c4d`` and Amazon S3 in the ``us-east-1`` region, and associates route table ``rtb-11aa22bb`` with the endpoint. ::

    aws ec2 create-vpc-endpoint \
        --vpc-id vpc-1a2b3c4d \
        --service-name com.amazonaws.us-east-1.s3 \
        --route-table-ids rtb-11aa22bb

Output::

    {
        "VpcEndpoint": {
            "PolicyDocument": "{\"Version\":\"2008-10-17\",\"Statement\":[{\"Sid\":\"\",\"Effect\":\"Allow\",\"Principal\":\"\*\",\"Action\":\"\*\",\"Resource\":\"\*\"}]}",
            "VpcId": "vpc-1a2b3c4d",
            "State": "available",
            "ServiceName": "com.amazonaws.us-east-1.s3",
            "RouteTableIds": [
                "rtb-11aa22bb"
            ],
            "VpcEndpointId": "vpc-1a2b3c4d",
            "CreationTimestamp": "2015-05-15T09:40:50Z"
        }
    }

For more information, see `Create a gateway endpoint <https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html#create-gateway-endpoint-s3>`__ in the *AWS PrivateLink User Guide*.

**Example 2: To create an interface endpoint**

The following ``create-vpc-endpoint`` example creates an interface VPC endpoint between VPC ``vpc-1a2b3c4d`` and Amazon S3 in the ``us-east-1`` region. The command creates the endpoint in subnet ``subnet-1a2b3c4d``, associates it with security group ``sg-1a2b3c4d``, and adds a tag with a key of "Service" and a Value of "S3". ::

    aws ec2 create-vpc-endpoint \
        --vpc-id vpc-1a2b3c4d \
        --vpc-endpoint-type Interface \
        --service-name com.amazonaws.us-east-1.s3 \
        --subnet-ids subnet-7b16de0c \
        --security-group-id sg-1a2b3c4d \
        --tag-specifications ResourceType=vpc-endpoint,Tags=[{Key=service,Value=S3}]

Output::

    {
        "VpcEndpoint": {
            "VpcEndpointId": "vpce-1a2b3c4d5e6f1a2b3",
            "VpcEndpointType": "Interface",
            "VpcId": "vpc-1a2b3c4d",
            "ServiceName": "com.amazonaws.us-east-1.s3",
            "State": "pending",
            "RouteTableIds": [],
            "SubnetIds": [
                "subnet-1a2b3c4d"
            ],
            "Groups": [
                {
                    "GroupId": "sg-1a2b3c4d",
                    "GroupName": "default"
                }
            ],
            "PrivateDnsEnabled": false,
            "RequesterManaged": false,
            "NetworkInterfaceIds": [
                "eni-0b16f0581c8ac6877"
            ],
            "DnsEntries": [
                {
                    "DnsName": "*.vpce-1a2b3c4d5e6f1a2b3-9hnenorg.s3.us-east-1.vpce.amazonaws.com",
                    "HostedZoneId": "Z7HUB22UULQXV"
                },
                {
                    "DnsName": "*.vpce-1a2b3c4d5e6f1a2b3-9hnenorg-us-east-1c.s3.us-east-1.vpce.amazonaws.com",
                    "HostedZoneId": "Z7HUB22UULQXV"
                }
            ],
            "CreationTimestamp": "2021-03-05T14:46:16.030000+00:00",
            "Tags": [
                {
                    "Key": "service",
                    "Value": "S3"
                }
            ],
            "OwnerId": "123456789012"
        }
    }

For more information, see `Create an interface VPC endpoint <https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html>`__ in the *AWS PrivateLink User Guide*.

**Example 3: To create a Gateway Load Balancer endpoint**

The following ``create-vpc-endpoint`` example creates a Gateway Load Balancer endpoint between VPC ``vpc-111122223333aabbc`` and and a service that is configured using a Gateway Load Balancer. ::

    aws ec2 create-vpc-endpoint \
        --service-name com.amazonaws.vpce.us-east-1.vpce-svc-123123a1c43abc123 \
        --vpc-endpoint-type GatewayLoadBalancer \
        --vpc-id vpc-111122223333aabbc \
        --subnet-ids subnet-0011aabbcc2233445

Output::

    {
        "VpcEndpoint": {
            "VpcEndpointId": "vpce-aabbaabbaabbaabba",
            "VpcEndpointType": "GatewayLoadBalancer",
            "VpcId": "vpc-111122223333aabbc",
            "ServiceName": "com.amazonaws.vpce.us-east-1.vpce-svc-123123a1c43abc123",
            "State": "pending",
            "SubnetIds": [
                "subnet-0011aabbcc2233445"
            ],
            "RequesterManaged": false,
            "NetworkInterfaceIds": [
                "eni-01010120203030405"
            ],
            "CreationTimestamp": "2020-11-11T08:06:03.522Z",
            "OwnerId": "123456789012"
        }
    }

For more information, see `Gateway Load Balancer endpoints <https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-load-balancer-endpoints.html>`__ in the *AWS PrivateLink User Guide*.

**Example 4: To create a resource endpoint**

The following ``create-vpc-endpoint`` example creates a resource endpoint. ::

    aws ec2 create-vpc-endpoint \
        --vpc-endpoint-type Resource \
        --vpc-id vpc-111122223333aabbc \
        --subnet-ids subnet-0011aabbcc2233445 \
        --resource-configuration-arn arn:aws:vpc-lattice-us-east-1:123456789012:resourceconfiguration/rcfg-0123abcde98765432

Output::

    {
        "VpcEndpoint": {
            "VpcEndpointId": "vpce-00939a7ed9EXAMPLE",
            "VpcEndpointType": "Resource",
            "VpcId": "vpc-111122223333aabbc",
            "State": "Pending",
            "SubnetIds": [
                "subnet-0011aabbcc2233445"
            ],
            "Groups": [
                {
                    "GroupId": "sg-03e2f15fbfc09b000",
                    "GroupName": "default"
                }
            ],
            "IpAddressType": "IPV4",
            "PrivateDnsEnabled": false,
            "CreationTimestamp": "2025-02-06T23:38:49.525000+00:00",
            "Tags": [],
            "OwnerId": "123456789012",
            "ResourceConfigurationArn": "arn:aws:vpc-lattice:us-east-1:123456789012:resourceconfiguration/rcfg-0123abcde98765432"
        }
    }

For more information, see `Resource endpoints <https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-resources.html>`__ in the *AWS PrivateLink User Guide*.

**Example 5: To create a service network endpoint**

The following ``create-vpc-endpoint`` example creates a service network endpoint. ::

    aws ec2 create-vpc-endpoint \
        --vpc-endpoint-type ServiceNetwork \
        --vpc-id vpc-111122223333aabbc \
        --subnet-ids subnet-0011aabbcc2233445 \
        --service-network-arn arn:aws:vpc-lattice:us-east-1:123456789012:servicenetwork/sn-0101abcd5432abcd0 \
        --security-group-ids sg-0123456789012abcd

Output::

    {
        "VpcEndpoint": {
            "VpcEndpointId": "vpce-0f00567fa8EXAMPLE",
            "VpcEndpointType": "ServiceNetwork",
            "VpcId": "vpc-111122223333aabbc",
            "State": "Pending",
            "SubnetIds": [
                "subnet-0011aabbcc2233445"
            ],
            "Groups": [
                {
                    "GroupId": "sg-0123456789012abcd",
                    "GroupName": "my-security-group"
                }
            ],
            "IpAddressType": "IPV4",
            "PrivateDnsEnabled": false,
            "CreationTimestamp": "2025-02-06T23:44:20.449000+00:00",
            "Tags": [],
            "OwnerId": "123456789012",
            "ServiceNetworkArn": "arn:aws:vpc-lattice:us-east-1:123456789012:servicenetwork/sn-0101abcd5432abcd0"
        }
    }

For more information, see `Service network endpoints <https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-service-networks.html>`__ in the *AWS PrivateLink User Guide*.

