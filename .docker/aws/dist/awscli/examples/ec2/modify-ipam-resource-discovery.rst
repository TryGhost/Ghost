**To modify the operating regions of a resource discovery**

In this example, you're an IPAM delegated admin who wants to modify the operating regions of a resource discovery.

To complete this request:

* You cannot modify a default resource discovery and you must be the owner of the resource discovery.
* You need the resource discovery ID, which you can get with `describe-ipam-resource-discoveries <https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-ipam-resource-discoveries.html>`__.

The following ``modify-ipam-resource-discovery`` example modifies a non-default resource discovery in your AWS account. ::

    aws ec2 modify-ipam-resource-discovery \
        --ipam-resource-discovery-id ipam-res-disco-0f4ef577a9f37a162 \
        --add-operating-regions RegionName='us-west-1' \
        --remove-operating-regions RegionName='us-east-2' \
        --region us-east-1

Output::

    {
        "IpamResourceDiscovery": {
            "OwnerId": "149977607591",
            "IpamResourceDiscoveryId": "ipam-res-disco-0365d2977fc1672fe",
            "IpamResourceDiscoveryArn": "arn:aws:ec2::149977607591:ipam-resource-discovery/ipam-res-disco-0365d2977fc1672fe",
            "IpamResourceDiscoveryRegion": "us-east-1",
            "Description": "Example",
            "OperatingRegions": [
                {
                    "RegionName": "us-east-1"
                },
                {
                    "RegionName": "us-west-1"
                }
            ],
            "IsDefault": false,
            "State": "modify-in-progress"
        }
    }

For more information, see `Work with resource discoveries <https://docs.aws.amazon.com/vpc/latest/ipam/res-disc-work-with.html>`__ in the *Amazon VPC IPAM User Guide*.