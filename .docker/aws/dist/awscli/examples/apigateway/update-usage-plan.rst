**To change the period defined in a Usage Plan**

Command::

  aws apigateway update-usage-plan --usage-plan-id a1b2c3 --patch-operations op="replace",path="/quota/period",value="MONTH"

**To change the quota limit defined in a Usage Plan**

Command::

  aws apigateway update-usage-plan --usage-plan-id a1b2c3 --patch-operations op="replace",path="/quota/limit",value="500"

**To change the throttle rate limit defined in a Usage Plan**

Command::

  aws apigateway update-usage-plan --usage-plan-id a1b2c3 --patch-operations op="replace",path="/throttle/rateLimit",value="10"

**To change the throttle burst limit defined in a Usage Plan**

Command::

  aws apigateway update-usage-plan --usage-plan-id a1b2c3 --patch-operations op="replace",path="/throttle/burstLimit",value="20"
