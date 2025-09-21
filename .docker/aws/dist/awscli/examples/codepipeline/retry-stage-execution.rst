**To retry a failed action**

The following ``retry-stage-execution`` example retries a stage that has a failed action. ::

    aws codepipeline retry-stage-execution \
        --pipeline-name MyPipeline \
        --stage-name Deploy \
        --pipeline-execution-id b59babff-5f34-EXAMPLE \
        --retry-mode FAILED_ACTIONS

Output::

    {
        "pipelineExecutionId": "b59babff-5f34-EXAMPLE"
    }

For more information, see `Retry failed actions (CLI) <https://docs.aws.amazon.com/codepipeline/latest/userguide/actions-retry.html#actions-retry-cli>`__ in the *AWS CodePipeline User Guide*.