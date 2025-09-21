**To describe the tags for scheduled event notifications**

The following ``describe-instance-event-notification-attributes`` example describes the tags to appear in scheduled event notifications. ::

    aws ec2 describe-instance-event-notification-attributes 

Output::

    {
        "InstanceTagAttribute": {
            "InstanceTagKeys": [],
            "IncludeAllTagsOfInstance": true
        }
    }

For more information, see `Scheduled events for your instances <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-instances-status-check_sched.html>`__ in the *Amazon Elastic Compute Cloud User Guide for Linux Instances*.