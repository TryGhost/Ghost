**To create CloudWatch Events rules**

This example creates a rule that triggers every day at 9:00am (UTC).  If you use put-targets to add a Lambda function as a target of this rule, you could run the Lambda function every day at the specified time::

  aws events put-rule --name "DailyLambdaFunction" --schedule-expression "cron(0 9 * * ? *)"     

This example creates a rule that triggers when any EC2 instance in the region changes state::

  aws events put-rule --name "EC2InstanceStateChanges" --event-pattern "{\"source\":[\"aws.ec2\"],\"detail-type\":[\"EC2 Instance State-change Notification\"]}"  --role-arn "arn:aws:iam::123456789012:role/MyRoleForThisRule"

This example creates a rule that triggers when any EC2 instance in the region is stopped or terminated::

  aws events put-rule --name "EC2InstanceStateChangeStopOrTerminate" --event-pattern "{\"source\":[\"aws.ec2\"],\"detail-type\":[\"EC2 Instance State-change Notification\"],\"detail\":{\"state\":[\"stopped\",\"terminated\"]}}" --role-arn "arn:aws:iam::123456789012:role/MyRoleForThisRule" 
