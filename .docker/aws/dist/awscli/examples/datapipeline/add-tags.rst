**To add a tag to a pipeline**

This example adds the specified tag to the specified pipeline::

   aws datapipeline add-tags --pipeline-id df-00627471SOVYZEXAMPLE --tags key=environment,value=production key=owner,value=sales
   
To view the tags, use the describe-pipelines command. For example, the tags added in the example command appear as follows in the output for describe-pipelines::

  {
      ...
          "tags": [
              {
                  "value": "production",
                  "key": "environment"
              },
              {
                  "value": "sales",
                  "key": "owner"
              }
          ]
      ...
  }
