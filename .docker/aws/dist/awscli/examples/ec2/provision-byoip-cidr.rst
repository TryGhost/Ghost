**To provision an address range**

The following ``provision-byoip-cidr`` example provisions a public IP address range for use with AWS. ::

    aws ec2 provision-byoip-cidr \
        --cidr 203.0.113.25/24 \
        --cidr-authorization-context Message="$text_message",Signature="$signed_message"

Output::

    {
        "ByoipCidr": {
            "Cidr": "203.0.113.25/24",
            "State": "pending-provision"
        }
    }

For more information about creating the messages strings for the authorization context, see `Bring Your Own IP Addresses <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-byoip.html>`__ in the *Amazon EC2 User Guide*.
