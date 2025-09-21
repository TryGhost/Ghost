**To describe tags**

The following ``describe-tags`` example displays the resources the specified cluster associated with the specified tag names and values. ::

    aws redshift describe-tags \
        --resource-name arn:aws:redshift:us-west-2:123456789012:cluster:mycluster \
        --tag-keys clustertagkey \
        --tag-values clustertagvalue

Output::

    {
        "TaggedResources": [
			{
                "Tag": {
                    "Key": "clustertagkey",
                    "Value": "clustertagvalue"
                },
                "ResourceName": "arn:aws:redshift:us-west-2:123456789012:cluster:mycluster",
                "ResourceType": "cluster"
            }
        ]
    }

For more information, see `Tagging Resources in Amazon Redshift <https://docs.aws.amazon.com/redshift/latest/mgmt/amazon-redshift-tagging.html>`__ in the *Amazon Redshift Cluster Management Guide*.
