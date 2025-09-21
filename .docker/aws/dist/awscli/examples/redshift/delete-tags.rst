**To delete tags from a cluster**

The following ``delete-tags`` example deletes the tags with the specified key names from the specified cluster. ::

    aws redshift delete-tags \
        --resource-name arn:aws:redshift:us-west-2:123456789012:cluster:mycluster \
        --tag-keys "clustertagkey" "clustertagvalue"

This command does not produce any output.

For more information, see `Tagging Resources in Amazon Redshift <https://docs.aws.amazon.com/redshift/latest/mgmt/amazon-redshift-tagging.html>`__ in the *Amazon Redshift Cluster Management Guide*.
