**To create a findings report**

The following ``create-findings-report`` example creates a finding report. ::

    aws inspector2 create-findings-report \
        --report-format CSV \
        --s3-destination bucketName=inspector-sbom-123456789012,keyPrefix=sbom-key,kmsKeyArn=arn:aws:kms:us-west-2:123456789012:key/a1b2c3d4-5678-90ab-cdef-EXAMPLE33333 \
        --filter-criteria '{"ecrImageRepositoryName":[{"comparison":"EQUALS","value":"debian"}]}'

Output::

    {
        "reportId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333"
    }

For more information, see `Managing findings in Amazon Inspector <https://docs.aws.amazon.com/inspector/latest/user/findings-managing.html>`__ in the *Amazon Inspector User Guide*.
