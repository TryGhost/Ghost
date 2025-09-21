**To modify the payer responsibility**

The following ``modify-vpc-endpoint-service-payer-responsibility`` example modifies the payer responsibility of the specified endpoint service. ::

    aws ec2 modify-vpc-endpoint-service-payer-responsibility \
        --service-id vpce-svc-071afff70666e61e0 \
        --payer-responsibility ServiceOwner

This command produces no output.