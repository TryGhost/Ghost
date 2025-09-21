**Example 1: To describe a volume**

The following ``describe-volumes`` example describes the specified volumes in the current Region. ::

    aws ec2 describe-volumes \
        --volume-ids vol-049df61146c4d7901 vol-1234567890abcdef0

Output::

    {
        "Volumes": [
            {
                "AvailabilityZone": "us-east-1a",
                "Attachments": [
                    {
                        "AttachTime": "2013-12-18T22:35:00.000Z",
                        "InstanceId": "i-1234567890abcdef0",
                        "VolumeId": "vol-049df61146c4d7901",
                        "State": "attached",
                        "DeleteOnTermination": true,
                        "Device": "/dev/sda1"
                    }
                ],
                "Encrypted": true,
                "KmsKeyId": "arn:aws:kms:us-east-2a:123456789012:key/8c5b2c63-b9bc-45a3-a87a-5513eEXAMPLE,
                "VolumeType": "gp2",
                "VolumeId": "vol-049df61146c4d7901",
                "State": "in-use",
                "Iops": 100,
                "SnapshotId": "snap-1234567890abcdef0",
                "CreateTime": "2019-12-18T22:35:00.084Z",
                "Size": 8
            },
            {
                "AvailabilityZone": "us-east-1a",
                "Attachments": [],
                "Encrypted": false,
                "VolumeType": "gp2",
                "VolumeId": "vol-1234567890abcdef0",
                "State": "available",
                "Iops": 300,
                "SnapshotId": "",
                "CreateTime": "2020-02-27T00:02:41.791Z",
                "Size": 100
            }
        ]
    }

**Example 2: To describe volumes that are attached to a specific instance**

The following ``describe-volumes`` example describes all volumes that are both attached to the specified instance and set to delete when the instance terminates. ::

    aws ec2 describe-volumes \
        --region us-east-1 \
        --filters Name=attachment.instance-id,Values=i-1234567890abcdef0 Name=attachment.delete-on-termination,Values=true

For an example of the output for ``describe-volumes``, see Example 1.

**Example 3: To describe available volumes in a specific Availability Zone**

The following ``describe-volumes`` example describes all volumes that have a status of ``available`` and are in the specified Availability Zone. ::

    aws ec2 describe-volumes \
        --filters Name=status,Values=available Name=availability-zone,Values=us-east-1a

For an example of the output for ``describe-volumes``, see Example 1.

**Example 4: To describe volumes based on tags**

The following ``describe-volumes`` example describes all volumes that have the tag key ``Name`` and a value that begins with ``Test``. The output is then filtered with a query that displays only the tags and IDs of the volumes. ::

    aws ec2 describe-volumes \
        --filters Name=tag:Name,Values=Test* \
        --query "Volumes[*].{ID:VolumeId,Tag:Tags}"

Output::

    [
        {
           "Tag": [
               {
                   "Value": "Test2", 
                   "Key": "Name"
               }
           ], 
           "ID": "vol-1234567890abcdef0"
       }, 
       {
           "Tag": [
               {
                   "Value": "Test1", 
                   "Key": "Name"
               }
           ], 
           "ID": "vol-049df61146c4d7901"
        }
    ]

For additional examples using tag filters, see `Working with tags <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html#Using_Tags_CLI>`__ in the *Amazon EC2 User Guide*.
