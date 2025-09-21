**To retrieve the tags for a resource**

The following ``list-tags-for-resource`` example retrieves the tags associated with the specified file system. ::

    aws efs list-tags-for-resource \
        --resource-id fs-c7a0456e

Output::

    {
        "Tags": [
            {
                "Key": "Name",
                "Value": "my-file-system"            
            },
            {
                "Key": "Department",
                "Value": "Business Intelligence"
            }
        ]
    }

For more information, see `Managing file system tags <https://docs.aws.amazon.com/efs/latest/ug/manage-fs-tags.html>`__ in the *Amazon Elastic File System User Guide*.
