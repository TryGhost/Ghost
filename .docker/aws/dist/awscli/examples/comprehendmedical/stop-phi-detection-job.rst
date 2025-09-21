**To stop a protected health information (PHI) detection job**

The following ``stop-phi-detection-job`` example stops an asynchronous protected health information (PHI) detection job. ::

    aws comprehendmedical stop-phi-detection-job \
        --job-id "4750034166536cdb52ffa3295a1b00a3"

Output::

    {
        "JobId": "ab9887877365fe70299089371c043b96"
    }

For more information, see `Batch APIs <https://docs.aws.amazon.com/comprehend-medical/latest/dev/textanalysis-batchapi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.