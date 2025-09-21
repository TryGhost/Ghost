**To stop an asynchronous pii entities detection job**

The following ``stop-pii-entities-detection-job`` example stops an in-progress, asynchronous pii entities detection job. If the current job state is ``IN_PROGRESS`` the job is marked for 
termination and put into the ``STOP_REQUESTED`` state. If the job completes before it can be stopped, it is put into the ``COMPLETED`` state. ::

    aws comprehend stop-pii-entities-detection-job \
        --job-id 123456abcdeb0e11022f22a11EXAMPLE

Output::

    {
        "JobId": "123456abcdeb0e11022f22a11EXAMPLE,
        "JobStatus": "STOP_REQUESTED"
    }


For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.