**Example 1: To specify an IPv4 address for a network interface**

The following ``create-network-interface`` example creates a network interface for the specified subnet with the specified primary IPv4 address. ::

    aws ec2 create-network-interface \
        --subnet-id subnet-00a24d0d67acf6333 \
        --description "my network interface" \
        --groups sg-09dfba7ed20cda78b \
        --private-ip-address 10.0.8.17

Output::

    {
        "NetworkInterface": {
            "AvailabilityZone": "us-west-2a",
            "Description": "my network interface",
            "Groups": [
                {
                    "GroupName": "my-security-group",
                    "GroupId": "sg-09dfba7ed20cda78b"
                }
            ],
            "InterfaceType": "interface",
            "Ipv6Addresses": [],
            "MacAddress": "06:6a:0f:9a:49:37",
            "NetworkInterfaceId": "eni-0492b355f0cf3b3f8",
            "OwnerId": "123456789012",
            "PrivateDnsName": "ip-10-0-8-18.us-west-2.compute.internal",
            "PrivateIpAddress": "10.0.8.17",
            "PrivateIpAddresses": [
                {
                    "Primary": true,
                    "PrivateDnsName": "ip-10-0-8-17.us-west-2.compute.internal",
                    "PrivateIpAddress": "10.0.8.17"
                }
            ],
            "RequesterId": "AIDA4Z3Y7GSXTMEXAMPLE",
            "RequesterManaged": false,
            "SourceDestCheck": true,
            "Status": "pending",
            "SubnetId": "subnet-00a24d0d67acf6333",
            "TagSet": [],
            "VpcId": "vpc-02723a0feeeb9d57b"
        }
    }

**Example 2: To create a network interface with an IPv4 address and an IPv6 address**

The following ``create-network-interface`` example creates a network interface for the specified subnet with an IPv4 address and an IPv6 address that are selected by Amazon EC2. ::

    aws ec2 create-network-interface \
        --subnet-id subnet-00a24d0d67acf6333 \
        --description "my dual stack network interface" \
        --ipv6-address-count 1 \
        --groups sg-09dfba7ed20cda78b

Output::

    {
        "NetworkInterface": {
            "AvailabilityZone": "us-west-2a",
            "Description": "my dual stack network interface",
            "Groups": [
                {
                    "GroupName": "my-security-group",
                    "GroupId": "sg-09dfba7ed20cda78b"
                }
            ],
            "InterfaceType": "interface",
            "Ipv6Addresses": [
                {
                    "Ipv6Address": "2600:1f13:cfe:3650:a1dc:237c:393a:4ba7",
                    "IsPrimaryIpv6": false
                }
            ],
            "MacAddress": "06:b8:68:d2:b2:2d",
            "NetworkInterfaceId": "eni-05da417453f9a84bf",
            "OwnerId": "123456789012",
            "PrivateDnsName": "ip-10-0-8-18.us-west-2.compute.internal",
            "PrivateIpAddress": "10.0.8.18",
            "PrivateIpAddresses": [
                {
                    "Primary": true,
                    "PrivateDnsName": "ip-10-0-8-18.us-west-2.compute.internal",
                    "PrivateIpAddress": "10.0.8.18"
                }
            ],
            "RequesterId": "AIDA4Z3Y7GSXTMEXAMPLE",
            "RequesterManaged": false,
            "SourceDestCheck": true,
            "Status": "pending",
            "SubnetId": "subnet-00a24d0d67acf6333",
            "TagSet": [],
            "VpcId": "vpc-02723a0feeeb9d57b",
            "Ipv6Address": "2600:1f13:cfe:3650:a1dc:237c:393a:4ba7"
        }
    }

**Example 3: To create a network interface with connection tracking configuration options**

The following ``create-network-interface`` example creates a network interface and configures the idle connection tracking timeouts. ::

    aws ec2 create-network-interface \
        --subnet-id subnet-00a24d0d67acf6333 \
        --groups sg-02e57dbcfe0331c1b \
        --connection-tracking-specification TcpEstablishedTimeout=86400,UdpTimeout=60

Output::

    {
        "NetworkInterface": {
            "AvailabilityZone": "us-west-2a",
            "ConnectionTrackingConfiguration": {
                "TcpEstablishedTimeout": 86400,
                "UdpTimeout": 60
            },
            "Description": "",
            "Groups": [
                {
                    "GroupName": "my-security-group",
                    "GroupId": "sg-02e57dbcfe0331c1b"
                }
            ],
            "InterfaceType": "interface",
            "Ipv6Addresses": [],
            "MacAddress": "06:4c:53:de:6d:91",
            "NetworkInterfaceId": "eni-0c133586e08903d0b",
            "OwnerId": "123456789012",
            "PrivateDnsName": "ip-10-0-8-94.us-west-2.compute.internal",
            "PrivateIpAddress": "10.0.8.94",
            "PrivateIpAddresses": [
                {
                    "Primary": true,
                    "PrivateDnsName": "ip-10-0-8-94.us-west-2.compute.internal",
                    "PrivateIpAddress": "10.0.8.94"
                }
            ],
            "RequesterId": "AIDA4Z3Y7GSXTMEXAMPLE",
            "RequesterManaged": false,
            "SourceDestCheck": true,
            "Status": "pending",
            "SubnetId": "subnet-00a24d0d67acf6333",
            "TagSet": [],
            "VpcId": "vpc-02723a0feeeb9d57b"
        }
    }

**Example 4: To create an Elastic Fabric Adapter**

The following ``create-network-interface`` example creates an EFA. ::

    aws ec2 create-network-interface \
        --interface-type efa \
        --subnet-id subnet-00a24d0d67acf6333 \
        --description "my efa" \
        --groups sg-02e57dbcfe0331c1b

Output::

    {
        "NetworkInterface": {
            "AvailabilityZone": "us-west-2a",
            "Description": "my efa",
            "Groups": [
                {
                    "GroupName": "my-efa-sg",
                    "GroupId": "sg-02e57dbcfe0331c1b"
                }
            ],
            "InterfaceType": "efa",
            "Ipv6Addresses": [],
            "MacAddress": "06:d7:a4:f7:4d:57",
            "NetworkInterfaceId": "eni-034acc2885e862b65",
            "OwnerId": "123456789012",
            "PrivateDnsName": "ip-10-0-8-180.us-west-2.compute.internal",
            "PrivateIpAddress": "10.0.8.180",
            "PrivateIpAddresses": [
                {
                    "Primary": true,
                    "PrivateDnsName": "ip-10-0-8-180.us-west-2.compute.internal",
                    "PrivateIpAddress": "10.0.8.180"
                }
            ],
            "RequesterId": "AIDA4Z3Y7GSXTMEXAMPLE",
            "RequesterManaged": false,
            "SourceDestCheck": true,
            "Status": "pending",
            "SubnetId": "subnet-00a24d0d67acf6333",
            "TagSet": [],
            "VpcId": "vpc-02723a0feeeb9d57b"
        }
    }

For more information, see `Elastic network interfaces <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html>`__ in the *Amazon EC2 User Guide*.
