**To describe the modification status for a volume**

The following ``describe-volumes-modifications`` example describes the volume modification status of the specified volume. ::

    aws ec2 describe-volumes-modifications \
        --volume-ids vol-1234567890abcdef0

Output::

    {
        "VolumeModification": {
            "TargetSize": 150,
            "TargetVolumeType": "io1",
            "ModificationState": "optimizing",
            "VolumeId": " vol-1234567890abcdef0",
            "TargetIops": 100,
            "StartTime": "2019-05-17T11:27:19.000Z",
            "Progress": 70,
            "OriginalVolumeType": "io1",
            "OriginalIops": 100,
            "OriginalSize": 100
        }
    }
