**Counting Open Workflow Executions**

You can use ``swf count-open-workflow-executions`` to retrieve the number of open workflow executions for a given domain. You can specify filters to count specific classes of executions.

The ``--domain`` and ``--start-time-filter`` arguments are required. All other arguments are optional. ::

    aws swf count-open-workflow-executions \
        --domain DataFrobtzz \
        --start-time-filter "{ \"latestDate\" : 1377129600, \"oldestDate\" : 1370044800 }"

Output::

    {
        "count": 4,
        "truncated": false
    }

If "truncated" is ``true``, then "count" represents the maximum number that can be returned by Amazon SWF. Any further results are truncated.

To reduce the number of results returned, you can:

-  modify the ``--start-time-filter`` values to narrow the time range that is searched.

-  use the ``--close-status-filter``, ``--execution-filter``, ``--tag-filter`` or ``--type-filter`` arguments to further
    filter the results. Each of these is mutually exclusive: You can specify *only one of these* in a request.

For more information, see `CountOpenWorkflowExecutions`_ in the *Amazon Simple Workflow Service API Reference*

.. _`CountOpenWorkflowExecutions`: https://docs.aws.amazon.com/amazonswf/latest/apireference/API_CountOpenWorkflowExecutions.html

