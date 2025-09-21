**To register a compliance type and compliance details to a designated instance**

This example registers the compliance type ``Custom:AVCheck`` to the specified managed instance. There is no output if the command succeeds.

Command::

  aws ssm put-compliance-items --resource-id "i-1234567890abcdef0" --resource-type "ManagedInstance" --compliance-type "Custom:AVCheck" --execution-summary "ExecutionTime=2019-02-18T16:00:00Z" --items "Id=Version2.0,Title=ScanHost,Severity=CRITICAL,Status=COMPLIANT"

