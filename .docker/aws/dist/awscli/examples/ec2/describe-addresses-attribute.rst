**To view the attributes of the domain name associated with an elastic IP address**

The following ``describe-addresses-attribute`` examples return the attributes of the domain name associated with the elastic IP address.

Linux::

    aws ec2 describe-addresses-attribute \
        --allocation-ids eipalloc-abcdef01234567890 \
        --attribute domain-name
        
Windows::

    aws ec2 describe-addresses-attribute ^
        --allocation-ids eipalloc-abcdef01234567890 ^
        --attribute domain-name
        
Output::

    {
        "Addresses": [
            {
                "PublicIp": "192.0.2.0",
                "AllocationId": "eipalloc-abcdef01234567890",
                "PtrRecord": "example.com."
            }
        ]
    }

To view the attributes of an elastic IP address, you must have first associated a domain name with the elastic IP address. For more information, see `Use reverse DNS for email applications <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html#Using_Elastic_Addressing_Reverse_DNS>`__ in the *Amazon EC2 User Guide* or `modify-address-attribute <https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-address-attribute.html>`__ in the *AWS CLI Command Reference*.
