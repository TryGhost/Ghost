**To start an entities detection job**

The following ``start-entities-detection-v2-job`` example starts an asynchronous entity detection job. ::

    aws comprehendmedical start-entities-detection-v2-job \
        --input-data-config "S3Bucket=comp-med-input" \
        --output-data-config "S3Bucket=comp-med-output" \
        --data-access-role-arn arn:aws:iam::867139942017:role/ComprehendMedicalBatchProcessingRole \
        --language-code en

Output::

    {
        "JobId": "ab9887877365fe70299089371c043b96"
    }

For more information, see `Batch APIs <https://docs.aws.amazon.com/comprehend-medical/latest/dev/textanalysis-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.