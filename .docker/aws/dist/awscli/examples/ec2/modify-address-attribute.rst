**To modify the domain name attribute associated with an elastic IP address**

The following ``modify-address-attribute`` examples modify the domain name attribute of an elastic IP address.

Linux::

    aws ec2 modify-address-attribute \
        --allocation-id eipalloc-abcdef01234567890 \
        --domain-name example.com

Windows::

    aws ec2 modify-address-attribute ^
        --allocation-id eipalloc-abcdef01234567890 ^
        --domain-name example.com

Output::

    {
        "Addresses": [
            {
                "PublicIp": "192.0.2.0",
                "AllocationId": "eipalloc-abcdef01234567890",
                "PtrRecord": "example.net."
                "PtrRecordUpdate": {
                    "Value": "example.com.",
                    "Status": "PENDING"
            }
        ]
    }

To monitor the pending change and to view the modified attributes of an elastic IP address, see `describe-addresses-attribute <https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-addresses-attribute.html>`__ in the *AWS CLI Command Reference*.