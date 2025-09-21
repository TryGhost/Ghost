**To temporarily change the state of an alarm**

The following example uses the ``set-alarm-state`` command to temporarily change the state of an
Amazon CloudWatch alarm named "myalarm" and set it to the ALARM state for testing purposes::

  aws cloudwatch set-alarm-state --alarm-name "myalarm" --state-value ALARM --state-reason "testing purposes"

This command returns to the prompt if successful.
