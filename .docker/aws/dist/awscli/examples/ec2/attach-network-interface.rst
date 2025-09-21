**Example 1: To attach a network interface to an instance**

The following ``attach-network-interface`` example attaches the specified network interface to the specified instance. ::

    aws ec2 attach-network-interface \
        --network-interface-id eni-0dc56a8d4640ad10a \
        --instance-id i-1234567890abcdef0 \
        --device-index 1  

Output::

    {
        "AttachmentId": "eni-attach-01a8fc87363f07cf9"
    }

For more information, see `Elastic network interfaces <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html>`__ in the *Amazon EC2 User Guide*.

**Example 2: To attach a network interface to an instance with multiple network cards**

The following ``attach-network-interface`` example attaches the specified network interface to the specified instance and network card. ::

    aws ec2 attach-network-interface \
        --network-interface-id eni-07483b1897541ad83 \
        --instance-id i-01234567890abcdef \
        --network-card-index 1 \
        --device-index 1  

Output::

    {
        "AttachmentId": "eni-attach-0fbd7ee87a88cd06c"
    }

For more information, see `Elastic network interfaces <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html>`__ in the *Amazon EC2 User Guide*.
