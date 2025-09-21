**Example 1: View complete details of resource discoveries**

In this example, you're a delegated IPAM admin who wants to create and share a resource discovery with the IPAM admin in another AWS Organization so that the admin can manage and monitor the IP addresses of resources in your organization.

This example may be useful if:

* You tried to create a resource discovery, but you got an error that you've reached your limit of 1. You realize that you may have already created a resource discovery and you want to view it in your account.
* You have resources in a Region that are not being discovered by the IPAM. You want to view the ``--operating-regions`` defined for the resource and ensure that you've added the right Region as an operating Region so that the resources there can be discovered.

The following ``describe-ipam-resource-discoveries`` example lists the details of the resource discovery in your AWS account. You can have one resource discovery per AWS Region. ::

    aws ec2 describe-ipam-resource-discoveries \
        --region us-east-1

Output::

    {
        "IpamResourceDiscoveries": [
            {
                "OwnerId": "149977607591",
                "IpamResourceDiscoveryId": "ipam-res-disco-0f8bdee9067137c0d",
                "IpamResourceDiscoveryArn": "arn:aws:ec2::149977607591:ipam-resource-discovery/ipam-res-disco-0f8bdee9067137c0d",
                "IpamResourceDiscoveryRegion": "us-east-1",
                "OperatingRegions": [
                    {
                        "RegionName": "us-east-1"
                    }
                ],
                "IsDefault": false,
                "State": "create-complete",
                "Tags": []
        }
    ]
    }

For more information, see `Integrate IPAM with accounts outside of your organization <https://docs.aws.amazon.com/vpc/latest/ipam/enable-integ-ipam-outside-org.html>`__ in the *Amazon VPC IPAM User Guide*.

**Example 2: View only resource discovery IDs**

The following ``describe-ipam-resource-discoveries`` example lists the ID of the resource discovery in your AWS account. You can have one resource discovery per AWS Region. ::

    aws ec2 describe-ipam-resource-discoveries \
        --query "IpamResourceDiscoveries[*].IpamResourceDiscoveryId" \
        --output text

Output::

    ipam-res-disco-0481e39b242860333

For more information, see `Integrate IPAM with accounts outside of your organization <https://docs.aws.amazon.com/vpc/latest/ipam/enable-integ-ipam-outside-org.html>`__ in the *Amazon VPC IPAM User Guide*.