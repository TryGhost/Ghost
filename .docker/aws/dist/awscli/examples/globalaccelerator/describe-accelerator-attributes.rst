**To describe an accelerator's attributes**

The following ``describe-accelerator-attributes`` example retrieves the attribute details for an accelerator. ::

    aws globalaccelerator describe-accelerator-attributes \
        --accelerator-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh

Output::

    {
        "AcceleratorAttributes": {
            "FlowLogsEnabled": true
            "FlowLogsS3Bucket": flowlogs-abc
            "FlowLogsS3Prefix": bucketprefix-abc
        }
    }

For more information, see `Accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-accelerators.html>`__ in the *AWS Global Accelerator Developer Guide*.