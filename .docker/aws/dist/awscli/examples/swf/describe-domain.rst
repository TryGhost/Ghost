**Getting Information About a Domain**

To get detailed information about a particular domain, use the
``swf describe-domain`` command. There is one required parameter:
``--name``, which takes the name of the domain you want information
about. ::

    aws swf describe-domain \
        --name DataFrobotz
            {
                "domainInfo": {
                    "status": "REGISTERED",
                    "name": "DataFrobotz"
                },
                "configuration": {
                    "workflowExecutionRetentionPeriodInDays": "1"
                }
            }

You can also use ``describe-domain`` to get information about deprecated
domains. ::

    aws swf describe-domain \
        --name MyNeatNewDomain
            {
                "domainInfo": {
                    "status": "DEPRECATED",
                    "name": "MyNeatNewDomain"
                },
                "configuration": {
                    "workflowExecutionRetentionPeriodInDays": "0"
                }
            }

See Also
--------

-  `DescribeDomain <https://docs.aws.amazon.com/amazonswf/latest/apireference/API_DescribeDomain.html>`__
   in the *Amazon Simple Workflow Service API Reference*

