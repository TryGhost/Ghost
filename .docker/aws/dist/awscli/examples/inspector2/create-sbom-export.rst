**To create a software bill of materials (SBOM) report**

The following ``create-sbom-export`` example creates a software bill of materials (SBOM) report. ::

    aws inspector2 create-sbom-export \
        --report-format SPDX_2_3 \
        --resource-filter-criteria 'ecrRepositoryName=[{comparison="EQUALS",value="debian"}]' \
        --s3-destination bucketName=inspector-sbom-123456789012,keyPrefix=sbom-key,kmsKeyArn=arn:aws:kms:us-west-2:123456789012:key/a1b2c3d4-5678-90ab-cdef-EXAMPLE33333

Output::

    {
        "reportId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333"
    }

For more information, see `Exporting SBOMs with Amazon Inspector <https://docs.aws.amazon.com/inspector/latest/user/sbom-export.html>`__ in the *Amazon Inspector User Guide*.
