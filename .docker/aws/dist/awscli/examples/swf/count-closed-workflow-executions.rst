**Counting Closed Workflow Executions**

You can use ``swf count-closed-workflow-executions`` to retrieve the number of closed workflow executions for a given domain. You can specify filters to count specific classes of executions.

The ``--domain`` and *either* ``--close-time-filter`` or ``--start-time-filter`` arguments are required. All other arguments are optional. ::

    aws swf count-closed-workflow-executions \
        --domain DataFrobtzz \
        --close-time-filter "{ \"latestDate\" : 1377129600, \"oldestDate\" : 1370044800 }"

Output::

    {
        "count": 2,
        "truncated": false
    }

If "truncated" is ``true``, then "count" represents the maximum number that can be returned by Amazon SWF. Any further results are truncated.

To reduce the number of results returned, you can:

-  modify the ``--close-time-filter`` or ``--start-time-filter`` values to narrow the time range that is searched. Each
    of these is mutually exclusive: You can specify *only one of these* in a request.

-  use the ``--close-status-filter``, ``--execution-filter``, ``--tag-filter`` or ``--type-filter`` arguments to further
    filter the results. However, these arguments are also mutually exclusive.

See Also
--------

-  `CountClosedWorkflowExecutions <https://docs.aws.amazon.com/amazonswf/latest/apireference/API_CountClosedWorkflowExecutions.html>`_ in the *Amazon Simple Workflow Service API Reference*