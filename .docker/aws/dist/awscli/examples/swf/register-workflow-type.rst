**Registering a Workflow Type**

To register a Workflow type with the AWS CLI, use the ``swf register-workflow-type`` command. ::

    aws swf register-workflow-type \
        --domain DataFrobtzz \
        --name "MySimpleWorkflow" \
        --workflow-version "v1"

If successful, the command produces no output.

On an error (for example, if you try to register the same workflow typetwice, or specify a domain that doesn't exist) you will get a response in JSON. ::

    {
        "message": "WorkflowType=[name=MySimpleWorkflow, version=v1]",
        "__type": "com.amazonaws.swf.base.model#TypeAlreadyExistsFault"
    }

The ``--domain``, ``--name`` and ``--workflow-version`` are required. You can also set the workflow description, timeouts, and child workflow policy.

For more information, see `RegisterWorkflowType <https://docs.aws.amazon.com/amazonswf/latest/apireference/API_RegisterWorkflowType.html>`__ in the *Amazon Simple Workflow Service API Reference*