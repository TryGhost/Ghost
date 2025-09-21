**To stop an entity detection job**

The following ``stop-entities-detection-v2-job`` example stops an asynchronous entity detection job. ::

    aws comprehendmedical stop-entities-detection-v2-job \
        --job-id "ab9887877365fe70299089371c043b96"

Output::

    {
        "JobId": "ab9887877365fe70299089371c043b96"
    }

For more information, see `Batch APIs <https://docs.aws.amazon.com/comprehend-medical/latest/dev/textanalysis-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.