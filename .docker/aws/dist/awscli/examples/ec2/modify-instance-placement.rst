**Example 1: To remove an instance's affinity with a Dedicated Host**

The following ``modify-instance-placement`` example removes an instance's affinity with a Dedicated Host and enables it to launch on any available Dedicated Host in your account that supports its instance type. ::

    aws ec2 modify-instance-placement \
        --instance-id i-0e6ddf6187EXAMPLE \
        --affinity default

Output::

    {
        "Return": true
    }

**Example 2: To establish affinity between an instance and the specified Dedicated Host**

The following ``modify-instance-placement`` example establishes a launch relationship between an instance and a Dedicated Host. The instance is only able to run on the specified Dedicated Host. ::

    aws ec2 modify-instance-placement \
        --instance-id i-0e6ddf6187EXAMPLE \
        --affinity host \
        --host-id i-0e6ddf6187EXAMPLE

Output::

    {
        "Return": true
    }

**Example 3: To move an instance to a placement group**

The following ``modify-instance-placement`` example moves an instance to a placement group, stop the instance, modify the instance placement, and then restart the instance. ::

    aws ec2 stop-instances \
        --instance-ids i-0123a456700123456

    aws ec2 modify-instance-placement \
        --instance-id i-0123a456700123456 \
        --group-name MySpreadGroup

    aws ec2 start-instances \
        --instance-ids i-0123a456700123456

**Example 4: To remove an instance from a placement group**

The following ``modify-instance-placement`` example removes an instance from a placement group by stopping the instance, modifying the instance placement, and then restarting the instance. The following example specifies an empty string ("") for the placement group name to indicate that the instance is not to be located in a placement group.

Stop the instance::

    aws ec2 stop-instances \
        --instance-ids i-0123a456700123456

Modify the placement (Windows Command Prompt)::

    aws ec2 modify-instance-placement \
        --instance-id i-0123a456700123456 \
        --group-name ""

Modify the placement (Windows PowerShell, Linux, and macOS)::

    aws ec2 modify-instance-placement `
        --instance-id i-0123a456700123456 `
        --group-name ''

Restart the instance::

    aws ec2 start-instances \
        --instance-ids i-0123a456700123456

Output::

    {
        "Return": true
    }

For more information, see `Modify Dedicated Host tenancy and affinity <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/moving-instances-dedicated-hosts.html>`__ in the *Amazon EC2 User Guide*.
