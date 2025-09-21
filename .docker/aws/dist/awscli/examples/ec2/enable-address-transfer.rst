**To enable an Elastic IP address transfer**

The following ``enable-address-transfer`` example enables Elastic IP address transfer for the specified Elastic IP address to the specified account. ::

    aws ec2 enable-address-transfer \
        --allocation-id eipalloc-09ad461b0d03f6aaf \
        --transfer-account-id 123456789012

Output::

    {
         "AddressTransfer": {
            "PublicIp": "100.21.184.216",
            "AllocationId": "eipalloc-09ad461b0d03f6aaf",
            "TransferAccountId": "123456789012",
            "TransferOfferExpirationTimestamp": "2023-02-22T20:51:01.000Z",
            "AddressTransferStatus": "pending"
        }
    }

For more information, see `Transfer Elastic IP addresses <https://docs.aws.amazon.com/vpc/latest/userguide/WorkWithEIPs.html#transfer-EIPs-intro>`__ in the *Amazon VPC User Guide*.
