**To modify the event start time for an instance**

The following ``modify-instance-event-start-time`` command shows how to modify the event start time for the specified instance. Specify the event ID by using the ``--instance-event-id`` parameter. Specify the new date and time by using the ``--not-before`` parameter. ::

    aws ec2 modify-instance-event-start-time --instance-id i-1234567890abcdef0 --instance-event-id instance-event-0abcdef1234567890 --not-before 2019-03-25T10:00:00.000

Output::

    "Event": {
        "InstanceEventId": "instance-event-0abcdef1234567890",
        "Code": "system-reboot",
        "Description": "scheduled reboot",
        "NotAfter": "2019-03-25T12:00:00.000Z",
        "NotBefore": "2019-03-25T10:00:00.000Z",
        "NotBeforeDeadline": "2019-04-22T21:00:00.000Z"
    }

For more information, see `Working with Instances Scheduled for Reboot`_ in the *Amazon Elastic Compute Cloud User Guide*

.. _`Working with Instances Scheduled for Reboot`: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-instances-status-check_sched.html#schedevents_actions_reboot
