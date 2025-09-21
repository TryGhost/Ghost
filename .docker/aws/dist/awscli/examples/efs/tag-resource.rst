**To tag a resource**

The following ``tag-resource`` example adds the tag ``Department=Business Intelligence`` to the specified file system. ::

    aws efs tag-resource \
        --resource-id fs-c7a0456e \
        --tags Key=Department,Value="Business Intelligence" 

This command produces no output.

For more information, see `Managing file system tags <https://docs.aws.amazon.com/efs/latest/ug/manage-fs-tags.html>`__ in the *Amazon Elastic File System User Guide*.
