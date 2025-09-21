**To list stack sets**

The following ``list-stack-sets`` example displays the list of stack sets in the current region and account. ::

    aws cloudformation list-stack-sets

Output::

    {
        "Summaries": [
            {
                "StackSetName": "enable-config",
                "StackSetId": "enable-config:296a3360-xmpl-40af-be78-9341e95bf743",
                "Description": "Enable AWS Config",
                "Status": "ACTIVE"
            }
        ]
    }
