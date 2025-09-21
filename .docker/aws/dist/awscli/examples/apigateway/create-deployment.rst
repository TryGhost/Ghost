**To deploy the configured resources for an API to a new Stage**

Command::

  aws apigateway create-deployment --rest-api-id 1234123412 --stage-name dev --stage-description 'Development Stage' --description 'First deployment to the dev stage'

**To deploy the configured resources for an API to an existing stage**

Command::

  aws apigateway create-deployment --rest-api-id 1234123412 --stage-name dev --description 'Second deployment to the dev stage'

**To deploy the configured resources for an API to an existing stage with Stage Variables**

  aws apigateway create-deployment --rest-api-id 1234123412 --stage-name dev --description 'Third deployment to the dev stage' --variables key='value',otherKey='otherValue'

