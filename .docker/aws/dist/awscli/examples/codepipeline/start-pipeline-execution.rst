**To run the latest revision through a pipeline**

This example runs the latest revision present in the source stage of a pipeline through the pipeline named "MyFirstPipeline".

Command::

  aws codepipeline start-pipeline-execution --name MyFirstPipeline


Output::

  {
    "pipelineExecutionId": "3137f7cb-7cf7-EXAMPLE"
  }