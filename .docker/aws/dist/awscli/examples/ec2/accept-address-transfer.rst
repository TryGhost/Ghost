**To accept an Elastic IP address transferred to your account**

The following ``accept-address-transfer`` example accepts the transfer of the specified Elastic IP address to your account. ::

    aws ec2 accept-address-transfer \
        --address 100.21.184.216

Output::

    {
        "AddressTransfer": {
            "PublicIp": "100.21.184.216",
            "AllocationId": "eipalloc-09ad461b0d03f6aaf",
            "TransferAccountId": "123456789012",
            "TransferOfferExpirationTimestamp": "2023-02-22T20:51:10.000Z",
            "TransferOfferAcceptedTimestamp": "2023-02-22T22:52:54.000Z",
            "AddressTransferStatus": "accepted"
        }
    }

For more information, see `Transfer Elastic IP addresses <https://docs.aws.amazon.com/vpc/latest/userguide/WorkWithEIPs.html#transfer-EIPs-intro>`__ in the *Amazon VPC User Guide*.