**To describe the tags for a file system**

The following ``describe-tags`` example describes the tags for the specified file system. ::

    aws efs describe-tags \
        --file-system-id fs-c7a0456e

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
