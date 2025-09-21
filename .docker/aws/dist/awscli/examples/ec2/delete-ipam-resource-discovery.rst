**To delete a resource discovery**

In this example, you're a IPAM delegated admin who wants to delete a non-default resource discovery that you created to share with another IPAM admin during the process of integrating IPAM with accounts outside of your organization.

To complete this request:

* The ``--region`` must be the Region where you created the resource discovery.
* You cannot delete a default resource discovery if ``"IsDefault": true``. A default resource discovery is one that is created automatically in the account that creates an IPAM. To delete a default resource discovery, you have to delete the IPAM.

The following ``delete-ipam-resource-discovery`` example deletes a resource discovery. ::

    aws ec2 delete-ipam-resource-discovery \
        --ipam-resource-discovery-id ipam-res-disco-0e39761475298ee0f \
        --region us-east-1

Output::

    {
        "IpamResourceDiscovery": {
            "OwnerId": "149977607591",
            "IpamResourceDiscoveryId": "ipam-res-disco-0e39761475298ee0f",
            "IpamResourceDiscoveryArn": "arn:aws:ec2::149977607591:ipam-resource-discovery/ipam-res-disco-0e39761475298ee0f",
            "IpamResourceDiscoveryRegion": "us-east-1",
            "OperatingRegions": [
                {
                    "RegionName": "us-east-1"
                }
            ],
            "IsDefault": false,
            "State": "delete-in-progress"
        }
    }

For more information about resource discoveries, see `Work with resource discoveries <https://docs.aws.amazon.com/vpc/latest/ipam/res-disc-work-with.html>`__ in the *Amazon VPC IPAM User Guide*.
