**To retrieve the current snapshot for the patch baseline an instance uses**

The following ``get-deployable-patch-snapshot-for-instance`` example retrieves details for the current snapshot for the specified patch baseline used by an instance. This command must be run from the instance using the instance credentials. To ensure it uses the instance credentials, run ``aws configure`` and specify only the Region of your instance. Leave the ``Access Key`` and ``Secret Key`` fields empty.

Tip: Use ``uuidgen`` to generate a ``snapshot-id``. ::

    aws ssm get-deployable-patch-snapshot-for-instance \
        --instance-id "i-1234567890abcdef0" \
        --snapshot-id "521c3536-930c-4aa9-950e-01234567abcd"

Output::

    {
        "InstanceId": "i-1234567890abcdef0",
        "SnapshotId": "521c3536-930c-4aa9-950e-01234567abcd",
        "Product": "AmazonLinux2018.03",
        "SnapshotDownloadUrl": "https://patch-baseline-snapshot-us-east-1.s3.amazonaws.com/ed85194ef27214f5984f28b4d664d14f7313568fea7d4b6ac6c10ad1f729d7e7-773304212436/AMAZON_LINUX-521c3536-930c-4aa9-950e-01234567abcd?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20190215T164031Z&X-Amz-SignedHeaders=host&X-Amz-Expires=86400&X-Amz-Credential=AKIAJ5C56P35AEBRX2QQ%2F20190215%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=efaaaf6e3878e77f48a6697e015efdbda9c426b09c5822055075c062f6ad2149"
    }

For more information, see `Parameter name: Snapshot ID <https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-about-aws-runpatchbaseline.html#patch-manager-about-aws-runpatchbaseline-parameters-snapshot-id>`__ in the *AWS Systems Manager User Guide*.
