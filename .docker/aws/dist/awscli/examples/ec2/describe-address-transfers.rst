**To describe an Elastic IP address transfer**

The following ``describe-address-transfers`` example describes the Elastic IP address transfer for the specified Elastic IP address. ::

    aws ec2 describe-address-transfers \
        --allocation-ids eipalloc-09ad461b0d03f6aaf

Output::

    {
        "AddressTransfers": [
            {
                "PublicIp": "100.21.184.216",
                "AllocationId": "eipalloc-09ad461b0d03f6aaf",
                "TransferAccountId": "123456789012",
                "TransferOfferExpirationTimestamp": "2023-02-22T22:51:01.000Z",
                "AddressTransferStatus": "pending"
            }
        ]
    }

For more information, see `Transfer Elastic IP addresses <https://docs.aws.amazon.com/vpc/latest/userguide/vpc-eips.html#transfer-EIPs-intro>`__ in the *Amazon VPC User Guide*.
