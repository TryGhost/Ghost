**To retrieve a list of pipelines**

The following ``list-pipelines`` example displays a list of available pipelines. ::

    aws iotanalytics list-pipelines

Output::

    {
        "pipelineSummaries": [
            {
                "pipelineName": "mypipeline",
                "creationTime": 1557859124.432,
                "lastUpdateTime": 1557859124.432,
                "reprocessingSummaries": []
            }
        ]
    }

For more information, see `ListPipelines <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_ListPipelines.html>`__ in the *AWS IoT Analytics API Reference*.
