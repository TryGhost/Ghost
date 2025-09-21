**To associate a resource discovery with an IPAM**

In this example, you are an IPAM delegated admin and a resource discovery has been created and shared with you by another AWS account so that you can use IPAM to manage and monitor resource CIDRs owned by the other account.

Note

* To complete this request, you'll need the resource discovery ID which you can get with `describe-ipam-resource-discoveries <https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-ipam-resource-discoveries.html>`__ and the IPAM ID which you can get with `describe-ipams <https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-ipams.html>`__.
* The resource discovery that you are associating must have first been shared with your account using AWS RAM.
* The ``--region`` you enter must match the home Region of the IPAM you are associating it with.

The following ``associate-ipam-resource-discovery`` example associates a resource discovery with an IPAM. ::

    aws ec2 associate-ipam-resource-discovery \
        --ipam-id ipam-005f921c17ebd5107 \
        --ipam-resource-discovery-id ipam-res-disco-03e0406de76a044ee \
        --tag-specifications 'ResourceType=ipam-resource-discovery,Tags=[{Key=cost-center,Value=cc123}]' \
        --region us-east-1

Output::

    {
        {
            "IpamResourceDiscoveryAssociation": {
                "OwnerId": "320805250157",
                "IpamResourceDiscoveryAssociationId": "ipam-res-disco-assoc-04382a6346357cf82",
                "IpamResourceDiscoveryAssociationArn": "arn:aws:ec2::320805250157:ipam-resource-discovery-association/ipam-res-disco-assoc-04382a6346357cf82",
                "IpamResourceDiscoveryId": "ipam-res-disco-0365d2977fc1672fe",
                "IpamId": "ipam-005f921c17ebd5107",
                "IpamArn": "arn:aws:ec2::320805250157:ipam/ipam-005f921c17ebd5107",
                "IpamRegion": "us-east-1",
                "IsDefault": false,
                "ResourceDiscoveryStatus": "active",
                "State": "associate-in-progress",
                "Tags": []
            }
        }
    }

Once you associate a resource discovery, you can monitor and/or manage the IP addresses of resources created by the other accounts. For more information, see `Integrate IPAM with accounts outside of your organization <https://docs.aws.amazon.com/vpc/latest/ipam/enable-integ-ipam-outside-org.html>`__ in the *Amazon VPC IPAM User Guide*.
