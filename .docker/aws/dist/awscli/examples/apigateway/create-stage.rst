**To create a stage in an API which will contain an existing deployment**

Command::

  aws apigateway create-stage --rest-api-id 1234123412 --stage-name 'dev' --description 'Development stage' --deployment-id a1b2c3

**To create a stage in an API which will contain an existing deployment and custom Stage Variables**

Command::

  aws apigateway create-stage --rest-api-id 1234123412 --stage-name 'dev' --description 'Development stage' --deployment-id a1b2c3 --variables key='value',otherKey='otherValue'
