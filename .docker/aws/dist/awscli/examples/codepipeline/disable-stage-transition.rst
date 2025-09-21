**To disable a transition to a stage in a pipeline**

This example disables transitions into the Beta stage of the MyFirstPipeline pipeline in AWS CodePipeline. 

Command::

  aws codepipeline disable-stage-transition --pipeline-name MyFirstPipeline --stage-name Beta  --transition-type Inbound


Output::

  None.