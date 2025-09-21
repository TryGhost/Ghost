**Listing Workflow Types**

To get a list of the workflow types for a domain, use ``swf list-workflow-types``. The ``--domain`` and
``--registration-status`` arguments are required. Here's a simple example. ::

    aws swf list-workflow-types \
        --domain DataFrobtzz \
        --registration-status REGISTERED

Output::

    {
        "typeInfos": [
            {
                "status": "REGISTERED",
                "creationDate": 1371454149.598,
                "description": "DataFrobtzz subscribe workflow",
                "workflowType": {
                    "version": "v3",
                    "name": "subscribe"
                }
            }
        ]
    }

As with ``list-activity-types``, you can use the ``--name`` argument to select only workflow types with a particular name, and use the ``--maximum-page-size`` argument in coordination with ``--next-page-token`` to page results. To reverse the order in which results are returned, use ``--reverse-order``.

See Also
--------

-  `ListWorkflowTypes <https://docs.aws.amazon.com/amazonswf/latest/apireference/API_ListWorkflowTypes.html>`_
   in the *Amazon Simple Workflow Service API Reference*

