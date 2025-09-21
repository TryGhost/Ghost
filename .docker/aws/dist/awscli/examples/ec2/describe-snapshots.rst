**Example 1: To describe a snapshot**

The following ``describe-snapshots`` example describes the specified snapshot. ::

    aws ec2 describe-snapshots \
        --snapshot-ids snap-1234567890abcdef0

Output::

    {
        "Snapshots": [
            {
                "Description": "This is my snapshot",
                "Encrypted": false,
                "VolumeId": "vol-049df61146c4d7901",
                "State": "completed",
                "VolumeSize": 8,
                "StartTime": "2019-02-28T21:28:32.000Z",
                "Progress": "100%",
                "OwnerId": "012345678910",
                "SnapshotId": "snap-01234567890abcdef",
                "Tags": [
                    {
                        "Key": "Stack",
                        "Value": "test"
                    }
                ]
            }
        ]
    }

For more information, see `Amazon EBS snapshots <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSSnapshots.html>`__ in the *Amazon EC2 User Guide*.

**Example 2: To describe snapshots based on filters**

The following ``describe-snapshots`` example uses filters to scope the results to snapshots owned by your AWS account that are in the ``pending`` state. The example uses the ``--query`` parameter to display only the snapshot IDs and the time the snapshot was started. ::

    aws ec2 describe-snapshots \
        --owner-ids self \
        --filters Name=status,Values=pending \
        --query "Snapshots[*].{ID:SnapshotId,Time:StartTime}"

Output::

    [
        {
            "ID": "snap-1234567890abcdef0", 
            "Time": "2019-08-04T12:48:18.000Z"
        },
        {
            "ID": "snap-066877671789bd71b",
            "Time": "2019-08-04T02:45:16.000Z
        },
        ...
    ]

The following ``describe-snapshots`` example uses filters to scope the results to snapshots created from the specified volume. The example uses the ``--query`` parameter to display only the snapshot IDs. ::

    aws ec2 describe-snapshots \
        --filters Name=volume-id,Values=049df61146c4d7901 \
        --query "Snapshots[*].[SnapshotId]" \
        --output text

Output::

    snap-1234567890abcdef0
    snap-08637175a712c3fb9
    ...

For additional examples using filters, see `Listing and filtering your resources <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Filtering.html#Filtering_Resources_CLI>`__ in the *Amazon EC2 User Guide*.

**Example 3: To describe snapshots based on tags**

The following ``describe-snapshots`` example uses tag filters to scope the results to snapshots that have the tag ``Stack=Prod``. ::

    aws ec2 describe-snapshots \
        --filters Name=tag:Stack,Values=prod

For an example of the output for ``describe-snapshots``, see Example 1.

For additional examples using tag filters, see `Working with tags <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html#Using_Tags_CLI>`__ in the *Amazon EC2 User Guide*.

**Example 4: To describe snapshots based on age**

The following ``describe-snapshots`` example uses JMESPath expressions to describe all snapshots created by your AWS account before the specified date. It displays only the snapshot IDs. ::

    aws ec2 describe-snapshots \
        --owner-ids 012345678910 \
        --query "Snapshots[?(StartTime<='2020-03-31')].[SnapshotId]"

For additional examples using filters, see `Listing and filtering your resources <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Filtering.html#Filtering_Resources_CLI>`__ in the *Amazon EC2 User Guide*.

**Example 5: To view only archived snapshots**

The following ``describe-snapshots`` example lists only snapshots that are stored in the archive tier. ::

    aws ec2 describe-snapshots \
        --filters "Name=storage-tier,Values=archive"

Output::

    {
        "Snapshots": [
            {
                "Description": "Snap A",
                "Encrypted": false,
                "VolumeId": "vol-01234567890aaaaaa",
                "State": "completed",
                "VolumeSize": 8,
                "StartTime": "2021-09-07T21:00:00.000Z",
                "Progress": "100%",
                "OwnerId": "123456789012",
                "SnapshotId": "snap-01234567890aaaaaa",
                "StorageTier": "archive",
                "Tags": []
            },
        ]
    }

For more information, see `View archived snapshots <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-snapshot-archiving.html#view-archived-snapshot>`__ in the *Amazon Elastic Compute Cloud User Guide*.