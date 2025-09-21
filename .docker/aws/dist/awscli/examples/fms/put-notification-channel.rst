**To set the SNS topic information for Firewall Manager logs**

The following ``put-notification-channel`` example sets the SNS topic information. ::

    aws fms put-notification-channel \
        --sns-topic-arn arn:aws:sns:us-west-2:123456789012:us-west-2-fms \
        --sns-role-name arn:aws:iam::123456789012:role/aws-service-role/fms.amazonaws.com/AWSServiceRoleForFMS

This command produces no output.                  

For more information, see `Configure Amazon SNS Notifications and Amazon CloudWatch Alarms <https://docs.aws.amazon.com/waf/latest/developerguide/get-started-fms-shield-cloudwatch.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
