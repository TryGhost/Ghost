**To upload a pipeline definition**

This example uploads the specified pipeline definition to the specified pipeline::

   aws datapipeline put-pipeline-definition --pipeline-id df-00627471SOVYZEXAMPLE --pipeline-definition file://my-pipeline-definition.json
   
The following is example output::

  {
    "validationErrors": [],
    "errored": false,
    "validationWarnings": []
  }
