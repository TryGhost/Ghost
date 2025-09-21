**To disable a CloudWatch Events rule**

This example disables the rule named DailyLambdaFunction. The rule is not deleted::

  aws events disable-rule --name "DailyLambdaFunction"
