**To get the mapping template for a model defined under a REST API**

Command::

  aws apigateway get-model-template --rest-api-id 1234123412 --model-name Empty

Output::

  {
      "value": "#set($inputRoot = $input.path('$'))\n{ }"
  }

