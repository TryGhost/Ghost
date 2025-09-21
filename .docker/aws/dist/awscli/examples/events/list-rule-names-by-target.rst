**To display all the rules that have a specified target**

This example displays all rules that have the Lambda function named "MyFunctionName" as the target::

  aws events list-rule-names-by-target --target-arn "arn:aws:lambda:us-east-1:123456789012:function:MyFunctionName"
