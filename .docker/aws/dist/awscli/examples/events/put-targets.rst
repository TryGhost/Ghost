**To add targets for CloudWatch Events rules**

This example adds a Lambda function as the target of a rule::

  aws events put-targets --rule DailyLambdaFunction --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:MyFunctionName" 

This example sets an Amazon Kinesis stream as the target, so that events caught by this rule are relayed to the stream::

  aws events put-targets --rule EC2InstanceStateChanges --targets "Id"="1","Arn"="arn:aws:kinesis:us-east-1:123456789012:stream/MyStream","RoleArn"="arn:aws:iam::123456789012:role/MyRoleForThisRule"

This example sets two Amazon Kinesis streams as targets for one rule::

  aws events put-targets --rule DailyLambdaFunction --targets "Id"="Target1","Arn"="arn:aws:kinesis:us-east-1:379642911888:stream/MyStream1","RoleArn"="arn:aws:iam::379642911888:role/ MyRoleToAccessLambda"  "Id"="Target2"," Arn"="arn:aws:kinesis:us-east-1:379642911888:stream/MyStream2","RoleArn"="arn:aws:iam::379642911888:role/MyRoleToAccessLambda"
