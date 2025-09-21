**Example 1: To create a multi-volume snapshot**

The following ``create-snapshots`` example creates snapshots of all volumes attached to the specified instance. ::

    aws ec2 create-snapshots \
        --instance-specification InstanceId=i-1234567890abcdef0 \
        --description "This is snapshot of a volume from my-instance"

Output::

    {
        "Snapshots": [
            {
                "Description": "This is a snapshot of a volume from my-instance",
                "Tags": [],
                "Encrypted": false,
                "VolumeId": "vol-0a01d2d5a34697479",
                "State": "pending",
                "VolumeSize": 16,
                "StartTime": "2019-08-05T16:58:19.000Z",
                "Progress": "",
                "OwnerId": "123456789012",
                "SnapshotId": "snap-07f30e3909aa0045e"
            },
            {
                "Description": "This is a snapshot of a volume from my-instance",
                "Tags": [],
                "Encrypted": false,
                "VolumeId": "vol-02d0d4947008cb1a2",
                "State": "pending",
                "VolumeSize": 20,
                "StartTime": "2019-08-05T16:58:19.000Z",
                "Progress": "",
                "OwnerId": "123456789012",
                "SnapshotId": "snap-0ec20b602264aad48"
            },
            ...
        ]
    }

**Example 2: To create a multi-volume snapshot with tags from the source volume**

The following ``create-snapshots`` example creates snapshots of all volumes attached to the specified instance and copies the tags from each volume to its corresponding snapshot. ::

    aws ec2 create-snapshots \
        --instance-specification InstanceId=i-1234567890abcdef0 \
        --copy-tags-from-source volume \
        --description "This is snapshot of a volume from my-instance"

Output::

    {
        "Snapshots": [
            {
                "Description": "This is a snapshot of a volume from my-instance",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "my-volume"
                    }
                ],
                "Encrypted": false,
                "VolumeId": "vol-02d0d4947008cb1a2",
                "State": "pending",
                "VolumeSize": 20,
                "StartTime": "2019-08-05T16:53:04.000Z",
                "Progress": "",
                "OwnerId": "123456789012",
                "SnapshotId": "snap-053bfaeb821a458dd"
            }
            ...
        ]
    }

**Example 3: To create a multi-volume snapshot not including the root volume**

The following ``create-snapshots`` example creates a snapshot of all volumes attached to the specified instance except for the root volume. ::

    aws ec2 create-snapshots \
        --instance-specification InstanceId=i-1234567890abcdef0,ExcludeBootVolume=true 

See example 1 for sample output.

**Example 4: To create a multi-volume snapshot and add tags**

The following ``create-snapshots`` example creates snapshots of all volumes attached to the specified instance and adds two tags to each snapshot. ::

    aws ec2 create-snapshots \
        --instance-specification InstanceId=i-1234567890abcdef0 \
        --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=backup},{Key=costcenter,Value=123}]'

See example 1 for sample output.