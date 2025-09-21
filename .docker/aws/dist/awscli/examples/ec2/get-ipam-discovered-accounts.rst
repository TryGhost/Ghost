**To view the accounts discovered by an IPAM**

In this scenario, you're a IPAM delegated admin who wants to view the AWS accounts that own resources that the IPAM is discovering.

The ``--discovery-region`` is the IPAM operating Region you want to view the monitored account statuses in. For example, if you have three IPAM operating Regions, you may want to make this request three times to view the timestamps specific to discovery in each of those particular Regions.

The following ``get-ipam-discovered-accounts`` example lists the AWS accounts that own resources that the IPAM is discovering. ::

     aws ec2 get-ipam-discovered-accounts \
        --ipam-resource-discovery-id ipam-res-disco-0365d2977fc1672fe \
        --discovery-region us-east-1

Output::

    {
        "IpamDiscoveredAccounts": [
            {
                "AccountId": "149977607591",
                "DiscoveryRegion": "us-east-1",
                "LastAttemptedDiscoveryTime": "2024-02-09T19:04:31.379000+00:00",
                "LastSuccessfulDiscoveryTime": "2024-02-09T19:04:31.379000+00:00"
            }
        ]
    }

For more information, see `Integrate IPAM with accounts outside of your organization <https://docs.aws.amazon.com/vpc/latest/ipam/enable-integ-ipam-outside-org.html>`__ in the *Amazon VPC IPAM User Guide*.