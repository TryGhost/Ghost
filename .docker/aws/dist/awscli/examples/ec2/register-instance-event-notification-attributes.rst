**Example 1: To include all tags in event notifications**

The following ``register-instance-event-notification-attributes`` example includes all tags in event notifications. ::

    aws ec2 register-instance-event-notification-attributes \
        --instance-tag-attribute IncludeAllTagsOfInstance=true

Output::

    {
        "InstanceTagAttribute": {
            "InstanceTagKeys": [],
            "IncludeAllTagsOfInstance": true
        }
    }

For more information, see `Scheduled events for your instances <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-instances-status-check_sched.html>`__ in the *Amazon EC2 User Guide*.

**Example 2: To include specific tags in event notifications**

The following ``register-instance-event-notification-attributes`` example includes the specified tags in event notifications. You cannot specify tags if ``IncludeAllTagsOfInstance`` is ``true``. ::

    aws ec2 register-instance-event-notification-attributes \
        --instance-tag-attribute InstanceTagKeys="tag-key1","tag-key2"

Output::

    {
        "InstanceTagAttribute": {
            "InstanceTagKeys": [
                "tag-key1",
                "tag-key2"
            ],
            "IncludeAllTagsOfInstance": false
        }
    }

For more information, see `Scheduled events for your instances <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-instances-status-check_sched.html>`__ in the *Amazon EC2 User Guide*.
