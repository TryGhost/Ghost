**To view discovered public IP addresses**

In this example, you are an IPAM delegated admin and you want to view the IP addresses of resources discovered by IPAM. You can get the resource discovery ID with `describe-ipam-resource-discoveries <https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-ipam-resource-discoveries.html>`__.

The following ``get-ipam-discovered-public-addresses`` example shows the discovered public IP addresses for a resource discovery. ::

    aws ec2 get-ipam-discovered-public-addresses \
        --ipam-resource-discovery-id ipam-res-disco-0f4ef577a9f37a162 \
        --address-region us-east-1 \
        --region us-east-1

Output::

    {
        "IpamDiscoveredPublicAddresses": [
            {
               "IpamResourceDiscoveryId": "ipam-res-disco-0f4ef577a9f37a162",
                "AddressRegion": "us-east-1",
                "Address": "54.208.155.7",
                "AddressOwnerId": "320805250157",
                "AssociationStatus": "associated",
                "AddressType": "ec2-public-ip",
                "VpcId": "vpc-073b294916198ce49",
                "SubnetId": "subnet-0b6c8a8839e9a4f15",
                "NetworkInterfaceId": "eni-081c446b5284a5e06",
                "NetworkInterfaceDescription": "",
                "InstanceId": "i-07459a6fca5b35823",
                "Tags": {},
                "NetworkBorderGroup": "us-east-1c",
                "SecurityGroups": [
                    {
                        "GroupName": "launch-wizard-2",
                        "GroupId": "sg-0a489dd6a65c244ce"
                    }
                ],
                "SampleTime": "2024-04-05T15:13:59.228000+00:00"
            },
            {
                "IpamResourceDiscoveryId": "ipam-res-disco-0f4ef577a9f37a162",
                "AddressRegion": "us-east-1",
                "Address": "44.201.251.218",
                "AddressOwnerId": "470889052923",
                "AssociationStatus": "associated",
                "AddressType": "ec2-public-ip",
                "VpcId": "vpc-6c31a611",
                "SubnetId": "subnet-062f47608b99834b1",
                "NetworkInterfaceId": "eni-024845359c2c3ae9b",
                "NetworkInterfaceDescription": "",
                "InstanceId": "i-04ef786d9c4e03f41",
                "Tags": {},
                "NetworkBorderGroup": "us-east-1a",
                "SecurityGroups": [
                    {
                        "GroupName": "launch-wizard-32",
                        "GroupId": "sg-0ed1a426e96a68374"
                    }
                ],
                "SampleTime": "2024-04-05T15:13:59.145000+00:00"
            }
    }

For more information, see `View public IP insights <https://docs.aws.amazon.com/vpc/latest/ipam/view-public-ip-insights.html>`__ in the *Amazon VPC IPAM User Guide*.
