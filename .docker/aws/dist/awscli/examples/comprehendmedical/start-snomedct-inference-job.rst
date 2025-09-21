**To start an SNOMED CT inference job**

The following ``start-snomedct-inference-job`` example starts a SNOMED CT inference batch analysis job. ::

    aws comprehendmedical start-snomedct-inference-job \
        --input-data-config "S3Bucket=comp-med-input" \
        --output-data-config "S3Bucket=comp-med-output" \
        --data-access-role-arn arn:aws:iam::867139942017:role/ComprehendMedicalBatchProcessingRole \
        --language-code en

Output::

    {
        "JobId": "dg7289877365fc70299089371c043b96"
    }

For more information, see `Ontology linking batch analysis <https://docs.aws.amazon.com/comprehend-medical/latest/dev/ontologies-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.
