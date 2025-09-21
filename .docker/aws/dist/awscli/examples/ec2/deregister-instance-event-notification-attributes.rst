**Example 1: To remove all tags from event notifications**

The following ``deregister-instance-event-notification-attributes`` example removes ``IncludeAllTagsOfInstance=true``, which has the effect of setting ``IncludeAllTagsOfInstance`` to ``false``. ::

    aws ec2 deregister-instance-event-notification-attributes \
        --instance-tag-attribute IncludeAllTagsOfInstance=true

Output::

    {
        "InstanceTagAttribute": {
            "InstanceTagKeys": [],
            "IncludeAllTagsOfInstance": true
        }
    }

For more information, see `Scheduled events for your instances <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-instances-status-check_sched.html>`__ in the *Amazon Elastic Compute Cloud User Guide for Linux Instances*.

**Example 2: To remove specific tags from event notifications**

The following ``deregister-instance-event-notification-attributes`` example removes the specified tag from the tags included in event notifications. To describe the remaining tags included in event notifications, use ``describe-instance-event-notification-attributes``. ::

    aws ec2 deregister-instance-event-notification-attributes \
        --instance-tag-attribute InstanceTagKeys="tag-key2"

Output::

    {
        "InstanceTagAttribute": {
            "InstanceTagKeys": [
                "tag-key2"
            ],
            "IncludeAllTagsOfInstance": false
        }
    }

For more information, see `Scheduled events for your instances <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-instances-status-check_sched.html>`__ in the *Amazon Elastic Compute Cloud User Guide for Linux Instances*.