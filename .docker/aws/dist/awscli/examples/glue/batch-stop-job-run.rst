**To stop job runs**

The following ``batch-stop-job-run`` example stops a job runs. ::

    aws glue batch-stop-job-run \
        --job-name "my-testing-job" \
        --job-run-id jr_852f1de1f29fb62e0ba4166c33970803935d87f14f96cfdee5089d5274a61d3f

Output::

    {
        "SuccessfulSubmissions": [
            {
                "JobName": "my-testing-job",
                "JobRunId": "jr_852f1de1f29fb62e0ba4166c33970803935d87f14f96cfdee5089d5274a61d3f"
            }
        ],
        "Errors": [],
        "ResponseMetadata": {
            "RequestId": "66bd6b90-01db-44ab-95b9-6aeff0e73d88",
            "HTTPStatusCode": 200,
            "HTTPHeaders": {
                "date": "Fri, 16 Oct 2020 20:54:51 GMT",
                "content-type": "application/x-amz-json-1.1",
                "content-length": "148",
                "connection": "keep-alive",
                "x-amzn-requestid": "66bd6b90-01db-44ab-95b9-6aeff0e73d88"
            },
            "RetryAttempts": 0
        }
    }

For more information, see `Job Runs <https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-jobs-runs.html>`__ in the *AWS Glue Developer Guide*.
