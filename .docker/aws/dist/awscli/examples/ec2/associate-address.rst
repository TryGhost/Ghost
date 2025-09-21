**Example 1: To associate an Elastic IP address with an instance**

The following ``associate-address`` example associates an Elastic IP address with the specified EC2 instance. ::

    aws ec2 associate-address \
        --instance-id i-0b263919b6498b123 \
        --allocation-id eipalloc-64d5890a

Output::

    {
        "AssociationId": "eipassoc-2bebb745"
    }

**Example 2: To associate an Elastic IP address with a network interface**

The following ``associate-address`` example associates the specified Elastic IP address with the specified network interface. ::

    aws ec2 associate-address 
        --allocation-id eipalloc-64d5890a \
        --network-interface-id eni-1a2b3c4d

Output::

    {
        "AssociationId": "eipassoc-2bebb745"
    }

**Example 3: To associate an Elastic IP address with a private IP address**

The following ``associate-address`` example associates the specified Elastic IP address with the specified private IP address in the specified network interface. ::

    aws ec2 associate-address \
        --allocation-id eipalloc-64d5890a \
        --network-interface-id eni-1a2b3c4d \
        --private-ip-address 10.0.0.85

Output::

    {
        "AssociationId": "eipassoc-2bebb745"
    }

For more information, see `Elastic IP addresses <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html>`__ in the *Amazon EC2 User Guide*.
