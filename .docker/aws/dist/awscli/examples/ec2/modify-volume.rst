**Example 1: To modify a volume by changing its size**

The following ``modify-volume`` example changes the size of the specified volume to 150GB. 

Command::

    aws ec2 modify-volume --size 150 --volume-id vol-1234567890abcdef0

Output::

    {
        "VolumeModification": {
            "TargetSize": 150,
            "TargetVolumeType": "io1",
            "ModificationState": "modifying",
            "VolumeId": " vol-1234567890abcdef0",
            "TargetIops": 100,
            "StartTime": "2019-05-17T11:27:19.000Z",
            "Progress": 0,
            "OriginalVolumeType": "io1",
            "OriginalIops": 100,
            "OriginalSize": 100
        }
    }

**Example 2: To modify a volume by changing its type, size, and IOPS value**

The following ``modify-volume`` example changes the volume type to Provisioned IOPS SSD, sets the target IOPS rate to 10000, and sets the volume size to 350GB. ::

    aws ec2 modify-volume \
        --volume-type io1 \
        --iops 10000 \
        --size 350 \
        --volume-id vol-1234567890abcdef0

Output::

    {
        "VolumeModification": {
            "TargetSize": 350,
            "TargetVolumeType": "io1",
            "ModificationState": "modifying",
            "VolumeId": "vol-0721c1a9d08c93bf6",
            "TargetIops": 10000,
            "StartTime": "2019-05-17T11:38:57.000Z",
            "Progress": 0,
            "OriginalVolumeType": "gp2",
            "OriginalIops": 150,
            "OriginalSize": 50
        }
    }
