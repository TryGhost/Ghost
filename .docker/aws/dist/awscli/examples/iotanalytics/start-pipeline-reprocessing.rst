**To start pipeline reprocessing**

The following ``start-pipeline-reprocessing`` example starts the reprocessing of raw message data through the specified pipeline. ::

    aws iotanalytics start-pipeline-reprocessing \
        --pipeline-name mypipeline

Output::

    {
        "reprocessingId": "6ad2764f-fb13-4de3-b101-4e74af03b043"
    }

For more information, see `StartPipelineReprocessing <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_StartPipelineReprocessing.html>`__ in the *AWS IoT Analytics API Reference*.
