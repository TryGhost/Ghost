**To describe the snapshot attributes for a snapshot**

The following ``describe-snapshot-attribute`` example lists the accounts with which a snapshot is shared. ::

    aws ec2 describe-snapshot-attribute \
        --snapshot-id snap-01234567890abcedf \
        --attribute createVolumePermission

Output::

    {
        "SnapshotId": "snap-01234567890abcedf",
        "CreateVolumePermissions": [
            {
                "UserId": "123456789012"
            }
        ]
    }

For more information, see `Share an Amazon EBS snapshot <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-modifying-snapshot-permissions.html#share-unencrypted-snapshot>`__ in the *Amazon Elastic Compute Cloud User Guide*.