**Example 1: To allocate a Dedicated Host**

The following ``allocate-hosts`` example allocates a single Dedicated Host in the ``eu-west-1a`` Availability Zone, onto which you can launch ``m5.large`` instances. By default, the Dedicated Host accepts only target instance launches, and does not support host recovery. ::

    aws ec2 allocate-hosts \
        --instance-type m5.large \
        --availability-zone eu-west-1a \
        --quantity 1

Output::

    {
        "HostIds": [
            "h-07879acf49EXAMPLE"
        ]
    }

**Example 2: To allocate a Dedicated Host with auto-placement and host recovery enabled**

The following ``allocate-hosts`` example allocates a single Dedicated Host in the ``eu-west-1a`` Availability Zone with auto-placement and host recovery enabled. ::

    aws ec2 allocate-hosts \
        --instance-type m5.large \
        --availability-zone eu-west-1a \
        --auto-placement on \
        --host-recovery on \
        --quantity 1

Output::

   {
        "HostIds": [
            "h-07879acf49EXAMPLE"
        ]
   }

**Example 3: To allocate a Dedicated Host with tags**

The following ``allocate-hosts`` example allocates a single Dedicated Host and applies a tag with a key named ``purpose`` and a value of ``production``. ::

    aws ec2 allocate-hosts \
        --instance-type m5.large \
        --availability-zone eu-west-1a \
        --quantity 1 \
        --tag-specifications 'ResourceType=dedicated-host,Tags={Key=purpose,Value=production}'

Output::

    {
        "HostIds": [
            "h-07879acf49EXAMPLE"
        ]
    }

For more information, see `Allocate a Dedicated Host <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-allocating.html>`__ in the *Amazon EC2 User Guide*.