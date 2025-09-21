**To delete an asynchronous invocation configuration**

The following ``delete-function-event-invoke-config`` example deletes the asynchronous invocation configuration for the ``GREEN`` alias of the specified function. ::

    aws lambda delete-function-event-invoke-config --function-name my-function:GREEN
