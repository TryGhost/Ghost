**To create a usage plan with throttle and quota limits that resets at the beginning of the month**

Command::

  aws apigateway create-usage-plan --name "New Usage Plan" --description "A new usage plan" --throttle burstLimit=10,rateLimit=5 --quota limit=500,offset=0,period=MONTH
