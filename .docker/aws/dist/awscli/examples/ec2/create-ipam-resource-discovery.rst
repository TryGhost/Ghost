**To create a resource discovery**

In this example, you're a delegated IPAM admin who wants to create and share a resource discovery with the IPAM admin in another AWS Organization so that the admin in the other organization can manage and monitor the IP addresses of resources in your organization.

Important

* This example includes both the ``--region`` and ``--operating-regions`` options because, while they are optional, they must be configured in a particular way to successfully integrate a resource discovery with an IPAM. 
  * ``--operating-regions`` must match the Regions where you have resources that you want IPAM to discover. If there are Regions where you do not want IPAM to manage the IP addresses (for example for compliance reasons), do not include them. 
  * ``--region`` must match the home Region of the IPAM you want to associate it with. You must create the resource discovery in the same Region that the IPAM was created in. For example, if the IPAM you are associating with was created in us-east-1, include ``--region us-east-1`` in the request.
* Both the ``--region`` and ``--operating-regions`` options default to the Region you're running the command in if you don't specify them.

In this example, the operating Regions of the IPAM we're integrating with include ``us-west-1``, ``us-west-2``, and ``ap-south-1``. When we create the resource discovery, we want IPAM to discover the resource IP addresses in ``us-west-1`` and ``us-west-2`` but not ``ap-south-1``. So we are including only ``--operating-regions RegionName='us-west-1' RegionName='us-west-2'`` in the request.

The following ``create-ipam-resource-discovery`` example creates an IPAM resource discovery. ::

    aws ec2 create-ipam-resource-discovery \
        --description 'Example-resource-discovery' \
        --tag-specifications 'ResourceType=ipam-resource-discovery,Tags=[{Key=cost-center,Value=cc123}]' \
        --operating-regions RegionName='us-west-1' RegionName='us-west-2' \
        --region us-east-1

Output::

    {
        "IpamResourceDiscovery":{
            "OwnerId": "149977607591",
            "IpamResourceDiscoveryId": "ipam-res-disco-0257046d8aa78b8bc",
            "IpamResourceDiscoveryArn": "arn:aws:ec2::149977607591:ipam-resource-discovery/ipam-res-disco-0257046d8aa78b8bc", 
            "IpamResourceDiscoveryRegion": "us-east-1",
            "Description": "'Example-resource-discovery'",
            "OperatingRegions":[
                {"RegionName": "us-west-1"},
                {"RegionName": "us-west-2"},
                {"RegionName": "us-east-1"}
            ],
            "IsDefault": false,
            "State": "create-in-progress",
            "Tags": [
                {
                    "Key": "cost-center",
                    "Value": "cc123"
                }
            ]
    }

Once you create a resource discovery, you may want to share it with another IPAM delegated admin, which you can do with `create-resource-share <https://docs.aws.amazon.com/cli/latest/reference/ram/create-resource-share.html>`__. For more information, see `Integrate IPAM with accounts outside of your organization <https://docs.aws.amazon.com/vpc/latest/ipam/enable-integ-ipam-outside-org.html>`__ in the *Amazon VPC IPAM User Guide*.