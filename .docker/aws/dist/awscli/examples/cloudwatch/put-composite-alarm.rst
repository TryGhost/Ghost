**To create a composite cloudwatch alarm**

The following ``put-composite-alarm`` example creates a composite alarm named ``ProdAlarm``  in the specified account. ::

    aws cloudwatch put-composite-alarm \
        --alarm-name ProdAlarm \
        --alarm-rule "ALARM(CPUUtilizationTooHigh) AND ALARM(MemUsageTooHigh)" \
        --alarm-actions arn:aws:sns:us-east-1:123456789012:demo \
        --actions-enabled

This command produces no output.

For more information, see `Create a composite alarm <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Composite_Alarm_How_To.html>`__ in the *Amazon CloudWatch User Guide*.