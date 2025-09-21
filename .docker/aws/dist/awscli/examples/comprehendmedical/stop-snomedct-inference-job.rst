**To stop a SNOMED CT inference job**

The following ``stop-snomedct-inference-job`` example stops a SNOMED CT inference batch analysis job. ::

    aws comprehendmedical stop-snomedct-inference-job \
        --job-id "8750034166436cdb52ffa3295a1b00a1"

Output::

    {
        "JobId": "8750034166436cdb52ffa3295a1b00a1",
    }

For more information, see `Ontology linking batch analysis <https://docs.aws.amazon.com/comprehend-medical/latest/dev/ontologies-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.