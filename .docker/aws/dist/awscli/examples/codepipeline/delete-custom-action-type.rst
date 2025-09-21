**To delete a custom action**

This example deletes a custom action in AWS CodePipeline by using an already-created JSON file (here named DeleteMyCustomAction.json) that contains the action type, provider name, and version number of the action to be deleted. Use the list-action-types command to view the correct values for category, version, and provider.

Command::

  aws codepipeline delete-custom-action-type --cli-input-json file://DeleteMyCustomAction.json
  
JSON file sample contents::
  
  {
    "category": "Build",
    "version": "1",
    "provider": "MyJenkinsProviderName"
  }

Output::

  None.