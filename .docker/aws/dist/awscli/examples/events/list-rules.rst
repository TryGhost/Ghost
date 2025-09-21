**To display a list of all CloudWatch Events rules**

This example displays all CloudWatch Events rules in the region::

  aws events list-rules

**To display a list of CloudWatch Events rules beginning with a certain string.**

This example displays all CloudWatch Events rules in the region that have a name starting with "Daily"::

  aws events list-rules --name-prefix "Daily"
