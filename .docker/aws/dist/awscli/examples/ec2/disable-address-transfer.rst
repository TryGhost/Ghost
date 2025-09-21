**To disable an Elastic IP address transfer**

The following ``disable-address-transfer`` example disables Elastic IP address transfer for the specified Elastic IP address. ::

    aws ec2 disable-address-transfer \
        --allocation-id eipalloc-09ad461b0d03f6aaf

Output::

    {
        "AddressTransfer": {
            "PublicIp": "100.21.184.216",
            "AllocationId": "eipalloc-09ad461b0d03f6aaf",
            "AddressTransferStatus": "disabled"
        }
    }

For more information, see `Transfer Elastic IP addresses <https://docs.aws.amazon.com/vpc/latest/userguide/WorkWithEIPs.html#transfer-EIPs-intro>`__ in the *Amazon VPC User Guide*.
