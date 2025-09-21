**To create an API key that is enabled for an existing API and Stage**

Command::

  aws apigateway create-api-key --name 'Dev API Key' --description 'Used for development' --enabled --stage-keys restApiId='a1b2c3d4e5',stageName='dev'
