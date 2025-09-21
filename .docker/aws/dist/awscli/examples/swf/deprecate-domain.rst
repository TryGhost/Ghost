**Deprecating a Domain**

To deprecate a domain (you can still see it, but cannot create new workflow executions or register types on it), use ``swf deprecate-domain``. It has a sole required parameter, ``--name``, which takes the name of the domain to deprecate. ::

    aws swf deprecate-domain \
        --name MyNeatNewDomain ""

As with ``register-domain``, no output is returned. If you use
``list-domains`` to view the registered domains, however, you will see
that the domain has been deprecated and no longer appears in the
returned data. ::

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
                        "name": "erontest"
                    }
                ]
            }

If you use ``--registration-status DEPRECATED`` with ``list-domains``, you will see your deprecated domain. ::

    aws swf list-domains \
        --registration-status DEPRECATED
            {
                "domainInfos": [
                    {
                        "status": "DEPRECATED",
                        "name": "MyNeatNewDomain"
                    }
                ]
            }

You can still use ``describe-domain`` to get information about a deprecated domain. ::

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

-  `DeprecateDomain <https://docs.aws.amazon.com/amazonswf/latest/apireference/API_DeprecateDomain.html>`__
   in the *Amazon Simple Workflow Service API Reference*

