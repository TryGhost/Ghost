**Registering a Domain**

You can use the AWS CLI to register new domains. Use the ``swf register-domain`` command.  There are two required parameters, ``--name``, which takes the domain name, and ``--workflow-execution-retention-period-in-days``, which takes an integer to specify the number of days to retain workflow execution data on this domain, up to a maxium period of 90 days (for more information, see the `SWF FAQ <https://aws.amazon.com/swf/faqs/#retain_limit>`). Workflow execution data
will not be retained after the specified number of days have passed. ::

    aws swf register-domain \
        --name MyNeatNewDomain \
        --workflow-execution-retention-period-in-days 0
        ""

When you register a domain, nothing is returned (""), but you can use ``swf list-domains`` or ``swf describe-domain`` to see the new domain. ::

    aws swf list-domains \
        --registration-status REGISTERED
            {
                "domainInfos": [
                    {
                        "status": "REGISTERED",
                        "name": "DataFrobotz"
                    },
                    {
                        "status": "REGISTERED",
                        "name": "MyNeatNewDomain"
                    },
                    {
                        "status": "REGISTERED",
                        "name": "erontest"
                    }
                ]
            }

Using ``swf describe-domain``::

    aws swf describe-domain --name MyNeatNewDomain
    {
        "domainInfo": {
            "status": "REGISTERED",
            "name": "MyNeatNewDomain"
        },
        "configuration": {
            "workflowExecutionRetentionPeriodInDays": "0"
        }
    }

See Also
--------

-  `RegisterDomain <https://docs.aws.amazon.com/amazonswf/latest/apireference/API_RegisterDomain.html>`__
   in the *Amazon Simple Workflow Service API Reference*

