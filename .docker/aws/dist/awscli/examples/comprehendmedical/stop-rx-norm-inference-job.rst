**To stop an RxNorm inference job**

The following ``stop-rx-norm-inference-job`` example stops an ICD-10-CM inference batch analysis job. ::

    aws comprehendmedical stop-rx-norm-inference-job \
        --job-id "eg8199877365fc70299089371c043b96"

Output::

    {
        "JobId": "eg8199877365fc70299089371c043b96",
    }

For more information, see `Ontology linking batch analysis <https://docs.aws.amazon.com/comprehend-medical/latest/dev/ontologies-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.