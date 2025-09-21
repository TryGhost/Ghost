**To get finding history**

The following ``get-finding-history`` example gets up to the last 90 days of history for the specified finding. In this example, the results are limited to two records of finding history. ::

    aws securityhub get-finding-history \
        --finding-identifier Id="arn:aws:securityhub:us-east-1:123456789012:security-control/S3.17/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",ProductArn="arn:aws:securityhub:us-east-1::product/aws/securityhub"

Output::

    {
        "Records": [
            {
                "FindingIdentifier": {
                    "Id": "arn:aws:securityhub:us-east-1:123456789012:security-control/S3.17/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                    "ProductArn": "arn:aws:securityhub:us-east-1::product/aws/securityhub"
                },
                "UpdateTime": "2023-06-02T03:15:25.685000+00:00",
                "FindingCreated": false,
                "UpdateSource": {
                    "Type": "BATCH_IMPORT_FINDINGS",
                    "Identity": "arn:aws:securityhub:us-east-1::product/aws/securityhub"
                },
                "Updates": [
                    {
                        "UpdatedField": "Compliance.RelatedRequirements",
                        "OldValue": "[\"NIST.800-53.r5 SC-12(2)\",\"NIST.800-53.r5 SC-12(3)\",\"NIST.800-53.r5 SC-12(6)\",\"NIST.800-53.r5 CM-3(6)\",\"NIST.800-53.r5 SC-13\",\"NIST.800-53.r5 SC-28\",\"NIST.800-53.r5 SC-28(1)\",\"NIST.800-53.r5 SC-7(10)\"]",
                        "NewValue": "[\"NIST.800-53.r5 SC-12(2)\",\"NIST.800-53.r5 CM-3(6)\",\"NIST.800-53.r5 SC-13\",\"NIST.800-53.r5 SC-28\",\"NIST.800-53.r5 SC-28(1)\",\"NIST.800-53.r5 SC-7(10)\",\"NIST.800-53.r5 CA-9(1)\",\"NIST.800-53.r5 SI-7(6)\",\"NIST.800-53.r5 AU-9\"]"
                    },
                    {
                        "UpdatedField": "LastObservedAt",
                        "OldValue": "2023-06-01T09:15:38.587Z",
                        "NewValue": "2023-06-02T03:15:22.946Z"
                    },
                    {
                        "UpdatedField": "UpdatedAt",
                        "OldValue": "2023-06-01T09:15:31.049Z",
                        "NewValue": "2023-06-02T03:15:14.861Z"
                    },
                    {
                        "UpdatedField": "ProcessedAt",
                        "OldValue": "2023-06-01T09:15:41.058Z",
                        "NewValue": "2023-06-02T03:15:25.685Z"
                    }
                ]
            },
            {
                "FindingIdentifier": {
                    "Id": "arn:aws:securityhub:us-east-1:123456789012:security-control/S3.17/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                    "ProductArn": "arn:aws:securityhub:us-east-1::product/aws/securityhub"
                },
                "UpdateTime": "2023-05-23T02:06:51.518000+00:00",
                "FindingCreated": "true",
                "UpdateSource": {
                    "Type": "BATCH_IMPORT_FINDINGS",
                    "Identity": "arn:aws:securityhub:us-east-1::product/aws/securityhub"
                },
                "Updates": []
            }
        ]
    }

For more information, see `Finding history <https://docs.aws.amazon.com/securityhub/latest/userguide/finding-view-details.html#finding-history>`__ in the *AWS Security Hub User Guide*.