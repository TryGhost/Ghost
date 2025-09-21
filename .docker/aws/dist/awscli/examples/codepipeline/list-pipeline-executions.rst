**To view pipeline execution history**

The following ``list-pipeline-executions`` example shows the pipeline execution history for a pipeline in your AWS account. ::

    aws codepipeline list-pipeline-executions \
        --pipeline-name MyPipeline

Output::

    {
        "pipelineExecutionSummaries": [
            {
                "lastUpdateTime": 1496380678.648,
                "pipelineExecutionId": "7cf7f7cb-3137-539g-j458-d7eu3EXAMPLE",
                "startTime": 1496380258.243,
                "status": "Succeeded"
            },
            {
                "lastUpdateTime": 1496591045.634,
                "pipelineExecutionId": "3137f7cb-8d494hj4-039j-d84l-d7eu3EXAMPLE",
                "startTime": 1496590401.222,
                "status": "Succeeded"
            },
            {
                "lastUpdateTime": 1496946071.6456,
                "pipelineExecutionId": "4992f7jf-7cf7-913k-k334-d7eu3EXAMPLE",
                "startTime": 1496945471.5645,
                "status": "Succeeded"
            }
        ]
    }

For more information, see `View execution history <https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-view-cli.html#pipelines-executions-cli>`__ in the *AWS CodePipeline User Guide*.