**To deactivate a pipeline**

This example deactivates the specified pipeline::

   aws datapipeline deactivate-pipeline --pipeline-id df-00627471SOVYZEXAMPLE
   
To deactivate the pipeline only after all running activities finish, use the following command::

   aws datapipeline deactivate-pipeline --pipeline-id df-00627471SOVYZEXAMPLE --no-cancel-active
