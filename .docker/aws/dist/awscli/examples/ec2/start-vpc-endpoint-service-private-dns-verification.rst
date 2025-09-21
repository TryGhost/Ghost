**To initiate the DNS verification process**

The following ``start-vpc-endpoint-service-private-dns-verification`` example initiates the DNS verification process for the specified endpoint service. ::

    aws ec2 start-vpc-endpoint-service-private-dns-verification \
        --service-id vpce-svc-071afff70666e61e0

This command produces no output.

For more information, see `Manage DNS names <https://docs.aws.amazon.com/vpc/latest/privatelink/manage-dns-names.html>`__ in the *AWS PrivateLink User Guide*.
