**To view all resource discovery associations with your IPAM**

In this example, you're a IPAM delegated admin who has associated resource discoveries with your IPAM to integrate other accounts with your IPAM. You've noticed that your IPAM is not discovering the resources in the operating Regions of the resource discovery as expected. You want to check the status and state of the resource discovery to ensure that the account that created it is still active and the resource discovery is still being shared.

The ``--region`` must be the home Region of your IPAM.

The following ``describe-ipam-resource-discovery-associations`` example lists the resource discovery associations in your AWS account. ::

    aws ec2 describe-ipam-resource-discovery-associations \
        --region us-east-1

Output::

    {
        "IpamResourceDiscoveryAssociations": [
            {
                "OwnerId": "320805250157",
                "IpamResourceDiscoveryAssociationId": "ipam-res-disco-assoc-05e6b45eca5bf5cf7",
                "IpamResourceDiscoveryAssociationArn": "arn:aws:ec2::320805250157:ipam-resource-discovery-association/ipam-res-disco-assoc-05e6b45eca5bf5cf7",
                "IpamResourceDiscoveryId": "ipam-res-disco-0f4ef577a9f37a162",
                "IpamId": "ipam-005f921c17ebd5107",
                "IpamArn": "arn:aws:ec2::320805250157:ipam/ipam-005f921c17ebd5107",
                "IpamRegion": "us-east-1",
                "IsDefault": true,
                "ResourceDiscoveryStatus": "active",
                "State": "associate-complete",
                "Tags": []
            },
            {
                "OwnerId": "149977607591",
                "IpamResourceDiscoveryAssociationId": "ipam-res-disco-assoc-0dfd21ae189ab5f62",
                "IpamResourceDiscoveryAssociationArn": "arn:aws:ec2::149977607591:ipam-resource-discovery-association/ipam-res-disco-assoc-0dfd21ae189ab5f62",
                "IpamResourceDiscoveryId": "ipam-res-disco-0365d2977fc1672fe",
                "IpamId": "ipam-005f921c17ebd5107",
                "IpamArn": "arn:aws:ec2::149977607591:ipam/ipam-005f921c17ebd5107",
                "IpamRegion": "us-east-1",
                "IsDefault": false,
                "ResourceDiscoveryStatus": "active",
                "State": "create-complete",
                "Tags": []
            }
        ]
    }

In this example, after running this command, you notice that you have one non-default resource discovery (``"IsDefault": false ``) that is ``"ResourceDiscoveryStatus": "not-found"`` and ``"State": "create-complete"``. The resource discovery owner's account has been closed. If, in another case, you notice that is ``"ResourceDiscoveryStatus": "not-found"`` and ``"State": "associate-complete"``, this indicates that one of the following has happened:

* The resource discovery was deleted by the resource discovery owner.
* The resource discovery owner unshared the resource discovery.

For more information, see `Integrate IPAM with accounts outside of your organization <https://docs.aws.amazon.com/vpc/latest/ipam/enable-integ-ipam-outside-org.html>`__ in the *Amazon VPC IPAM User Guide*.