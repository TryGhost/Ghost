**Example 1: To describe the ID format of a resource**

The following ``describe-id-format`` example describes the ID format for security groups. ::

    aws ec2 describe-id-format \
        --resource security-group

In the following example output, the ``Deadline`` value indicates that the deadline for this resource type to permanently switch from the short ID format to the long ID format expired at 00:00 UTC on August 15, 2018. ::

    {
        "Statuses": [
            {
                "Deadline": "2018-08-15T00:00:00.000Z",
                "Resource": "security-group",
                "UseLongIds": true
            }
        ]
    }

**Example 2: To describe the ID format for all resources**

The following ``describe-id-format`` example describes the ID format for all resource types. All resource types that supported the short ID format were switched to use the long ID format. ::

    aws ec2 describe-id-format
