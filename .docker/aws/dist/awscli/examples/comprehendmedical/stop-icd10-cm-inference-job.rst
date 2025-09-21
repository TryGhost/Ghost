**To stop an ICD-10-CM inference job**

The following ``stop-icd10-cm-inference-job`` example stops an ICD-10-CM inference batch analysis job. ::

    aws comprehendmedical stop-icd10-cm-inference-job \
        --job-id "4750034166536cdb52ffa3295a1b00a3"

Output::

    {
        "JobId": "ef7289877365fc70299089371c043b96",
    }

For more information, see `Ontology linking batch analysis <https://docs.aws.amazon.com/comprehend-medical/latest/dev/ontologies-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.