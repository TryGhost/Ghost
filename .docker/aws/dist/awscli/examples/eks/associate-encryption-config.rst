**To associates an encryption configuration to an existing cluster**

The following ``associate-encryption-config`` example enable's encryption on an existing EKS clusters that do not already have encryption enabled. ::

    aws eks associate-encryption-config \
        --cluster-name my-eks-cluster \
        --encryption-config '[{"resources":["secrets"],"provider":{"keyArn":"arn:aws:kms:region-code:account:key/key"}}]'

Output::

    {
        "update": {
            "id": "3141b835-8103-423a-8e68-12c2521ffa4d",
            "status": "InProgress",
            "type": "AssociateEncryptionConfig",
            "params": [
                {
                    "type": "EncryptionConfig",
                    "value": "[{\"resources\":[\"secrets\"],\"provider\":{\"keyArn\":\"arn:aws:kms:region-code:account:key/key\"}}]"
                }
            ],
            "createdAt": "2024-03-14T11:01:26.297000-04:00",
            "errors": []
        }
    }

For more information, see `Enabling secret encryption on an existing cluster <https://docs.aws.amazon.com/eks/latest/userguide/enable-kms.html>`__ in the *Amazon EKS User Guide*.
