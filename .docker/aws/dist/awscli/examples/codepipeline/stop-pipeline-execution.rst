**To stop a pipeline execution**

The following ``stop-pipeline-execution`` example defaults to waiting until in-progress actions finish, and then stops the pipeline. You cannot choose to stop and wait if the execution is already in a Stopping state. You can choose to stop and abandon an execution that is already in a Stopping state. ::

    aws codepipeline stop-pipeline-execution \
        --pipeline-name MyFirstPipeline \
        --pipeline-execution-id d-EXAMPLE \
        --reason "Stopping pipeline after the build action is done"

This command returns no output.

For more information, see `Stop a pipeline execution (CLI) <https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-stop.html#pipelines-stop-cli>`__ in the *AWS CodePipeline User Guide*.
