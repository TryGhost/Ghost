**To remove a tag from a resource**

The following ``untag-resource`` example removes the tag with the ``Department`` tag key from the specified file system. ::

    aws efs untag-resource \
        --resource-id fs-c7a0456e \
        --tag-keys Department

This command produces no output.

For more information, see `Managing file system tags <https://docs.aws.amazon.com/efs/latest/ug/manage-fs-tags.html>`__ in the *Amazon Elastic File System User Guide*.
