**To view a list of pipelines**

This example lists all AWS CodePipeline pipelines associated with the user's AWS account.

Command::

  aws codepipeline list-pipelines

Output::

  {
    "pipelines": [
        {
            "updated": 1439504274.641,
            "version": 1,
            "name": "MyFirstPipeline",
            "created": 1439504274.641
        },
        {
            "updated": 1436461837.992,
            "version": 2,
            "name": "MySecondPipeline",
            "created": 1436460801.381
        }
	]	
  }