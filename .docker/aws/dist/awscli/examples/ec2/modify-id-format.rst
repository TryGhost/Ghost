**To enable the longer ID format for a resource**

The following ``modify-id-format`` example enables the longer ID format for the ``instance`` resource type. ::

    aws ec2 modify-id-format \
        --resource instance \
        --use-long-ids

**To disable the longer ID format for a resource**

The following ``modify-id-format`` example disables the longer ID format for the ``instance`` resource type. ::

    aws ec2 modify-id-format \
        --resource instance \
        --no-use-long-ids

The following ``modify-id-format`` example enables the longer ID format for all supported resource types that are within their opt-in period. ::

    aws ec2 modify-id-format \
        --resource all-current \
        --use-long-ids
