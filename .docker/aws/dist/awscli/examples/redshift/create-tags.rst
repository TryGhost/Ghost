**To create tags for a cluster**

The following ``create-tags`` example adds the specified tag key/value pair to the specified cluster. ::

    aws redshift create-tags \
        --resource-name arn:aws:redshift:us-west-2:123456789012:cluster:mycluster \
        --tags "Key"="mytags","Value"="tag1"

This command does not produce any output.

For more information, see `Tagging Resources in Amazon Redshift <https://docs.aws.amazon.com/redshift/latest/mgmt/amazon-redshift-tagging.html>`__ in the *Amazon Redshift Cluster Management Guide*.
