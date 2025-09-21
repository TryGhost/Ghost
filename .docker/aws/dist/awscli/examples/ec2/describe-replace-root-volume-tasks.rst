**Example 1: To view information about a specific root volume replacement task**

The following ``describe-replace-root-volume-tasks`` example describes root volume replacement task replacevol-0111122223333abcd. ::

    aws ec2 describe-replace-root-volume-tasks \
        --replace-root-volume-task-ids replacevol-0111122223333abcd

Output::

    {
        "ReplaceRootVolumeTasks": [
            {
                "ReplaceRootVolumeTaskId": "replacevol-0111122223333abcd", 
                "Tags": [], 
                "InstanceId": "i-0123456789abcdefa", 
                "TaskState": "succeeded", 
                "StartTime": "2022-03-14T15:16:28Z", 
                "CompleteTime": "2022-03-14T15:16:52Z"
            }
        ]
    }

For more information, see `Replace a root volume <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-restoring-volume.html#replace-root>`__ in the *Amazon Elastic Compute Cloud User Guide*.


**Example 2: To view information about all root volume replacement tasks for a specific instance**

The following ``describe-replace-root-volume-tasks`` example describes all of the root volume replacement tasks for instance i-0123456789abcdefa. ::

    aws ec2 describe-replace-root-volume-tasks \
        --filters Name=instance-id,Values=i-0123456789abcdefa

Output::

    {
        "ReplaceRootVolumeTasks": [
            {
                "ReplaceRootVolumeTaskId": "replacevol-0111122223333abcd", 
                "Tags": [], 
                "InstanceId": "i-0123456789abcdefa", 
                "TaskState": "succeeded", 
                "StartTime": "2022-03-14T15:06:38Z", 
                "CompleteTime": "2022-03-14T15:07:03Z"
            }, 
            {
                "ReplaceRootVolumeTaskId": "replacevol-0444455555555abcd", 
                "Tags": [], 
                "InstanceId": "i-0123456789abcdefa", 
                "TaskState": "succeeded", 
                "StartTime": "2022-03-14T15:16:28Z", 
                "CompleteTime": "2022-03-14T15:16:52Z"
            }
        ]
    }

For more information, see `Replace a root volume <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-restoring-volume.html#replace-root>`__ in the *Amazon Elastic Compute Cloud User Guide*.