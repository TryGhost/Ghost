**Example 1: To enable auto-placement for a Dedicated Host**

The following ``modify-hosts`` example enables auto-placement for a Dedicated Host so that it accepts any untargeted instance launches that match its instance type configuration. ::

    aws ec2 modify-hosts \
        --host-id h-06c2f189b4EXAMPLE \
        --auto-placement on

Output::

    {
        "Successful": [
            "h-06c2f189b4EXAMPLE"
        ],
        "Unsuccessful": []
    }

For more information, see `Modify the auto-placement setting for a Dedicated Host <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/modify-host-auto-placement.html>`__ in the *Amazon EC2 User Guide*.

**Example 2: To enable host recovery for a Dedicated Host**

The following ``modify-hosts`` example enables host recovery for the specified Dedicated Host. ::

    aws ec2 modify-hosts \
        --host-id h-06c2f189b4EXAMPLE \
        --host-recovery on

Output::

    {
        "Successful": [
            "h-06c2f189b4EXAMPLE"
        ],
        "Unsuccessful": []
    }

For more information, see `Modify the auto-placement setting for a Dedicated Host <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/modify-host-auto-placement.html>`__ in the *Amazon EC2 User Guide*.
