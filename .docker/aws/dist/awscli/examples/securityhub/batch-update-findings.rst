**Example 1: To update a finding**

The following ``batch-update-findings`` example updates two findings to add a note, change the severity label, and resolve it. ::

    aws securityhub batch-update-findings \
        --finding-identifiers '[{"Id": "arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1/PCI.Lambda.2/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111", "ProductArn": "arn:aws:securityhub:us-west-1::product/aws/securityhub"}, {"Id": "arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1/PCI.Lambda.2/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222", "ProductArn": "arn:aws:securityhub:us-west-1::product/aws/securityhub"}]' \
        --note '{"Text": "Known issue that is not a risk.", "UpdatedBy": "user1"}' \
        --severity '{"Label": "LOW"}' \
        --workflow '{"Status": "RESOLVED"}'

Output::

    {
        "ProcessedFindings": [
            {
                "Id": "arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1/PCI.Lambda.2/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "ProductArn": "arn:aws:securityhub:us-west-1::product/aws/securityhub"
            },
            {
                "Id": "arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1/PCI.Lambda.2/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "ProductArn": "arn:aws:securityhub:us-west-1::product/aws/securityhub"
            }
        ],
        "UnprocessedFindings": []
    }

For more information, see `Using BatchUpdateFindings to update a finding <https://docs.aws.amazon.com/securityhub/latest/userguide/finding-update-batchupdatefindings.html>`__ in the *AWS Security Hub User Guide*.

**Example 2: To update a finding using shorthand syntax**

The following ``batch-update-findings`` example updates two findings to add a note, change the severity label, and resolve it using shorthand syntax. ::

    aws securityhub batch-update-findings \
        --finding-identifiers Id="arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1/PCI.Lambda.2/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",ProductArn="arn:aws:securityhub:us-west-1::product/aws/securityhub" Id="arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1/PCI.Lambda.2/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",ProductArn="arn:aws:securityhub:us-west-1::product/aws/securityhub" \
        --note Text="Known issue that is not a risk.",UpdatedBy="user1" \
        --severity Label="LOW" \
        --workflow Status="RESOLVED"

Output::

    {
        "ProcessedFindings": [
            {
                "Id": "arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1/PCI.Lambda.2/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "ProductArn": "arn:aws:securityhub:us-west-1::product/aws/securityhub"
            },
            {
                "Id": "arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1/PCI.Lambda.2/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "ProductArn": "arn:aws:securityhub:us-west-1::product/aws/securityhub"
            }
        ],
        "UnprocessedFindings": []
    }

For more information, see `Using BatchUpdateFindings to update a finding <https://docs.aws.amazon.com/securityhub/latest/userguide/finding-update-batchupdatefindings.html>`__ in the *AWS Security Hub User Guide*.
