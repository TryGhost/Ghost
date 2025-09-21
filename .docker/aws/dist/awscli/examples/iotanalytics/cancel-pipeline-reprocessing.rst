**To cancel the reprocessing of data through a pipeline**

The following ``cancel-pipeline-reprocessing`` example cancels the reprocessing of data through the specified pipeline. ::

    aws iotanalytics cancel-pipeline-reprocessing \
        --pipeline-name mypipeline \
        --reprocessing-id "6ad2764f-fb13-4de3-b101-4e74af03b043"

This command produces no output.

For more information, see `CancelPipelineReprocessing <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_CancelPipelineReprocessing.html>`__ in the *AWS IoT Analytics API Reference*.
