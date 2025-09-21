**To create a custom action**

This example creates a custom action for AWS CodePipeline using an already-created JSON file (here named MyCustomAction.json) that contains the structure of the custom action. For more information about the requirements for creating a custom action, including the structure of the file, see the AWS CodePipeline User Guide. ::

    aws codepipeline create-custom-action-type --cli-input-json file://MyCustomAction.json
  
Contents of JSON file ``MyCustomAction.json``::

    {
        "category": "Build",
        "provider": "MyJenkinsProviderName",
        "version": "1",
        "settings": {
            "entityUrlTemplate": "https://192.0.2.4/job/{Config:ProjectName}/",
            "executionUrlTemplate": "https://192.0.2.4/job/{Config:ProjectName}/lastSuccessfulBuild/{ExternalExecutionId}/"
        },
        "configurationProperties": [
            {
                "name": "MyJenkinsExampleBuildProject",
                "required": true,
                "key": true,
                "secret": false,
                "queryable": false,
                "description": "The name of the build project must be provided when this action is added to the pipeline.",
                "type": "String"
            }
        ],
        "inputArtifactDetails": {
            "maximumCount": 1,
            "minimumCount": 0
        },
        "outputArtifactDetails": {
            "maximumCount": 1,
            "minimumCount": 0
        }
    }

This command returns the structure of the custom action.
