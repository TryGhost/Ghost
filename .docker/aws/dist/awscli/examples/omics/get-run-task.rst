**To view a task**

The following ``get-run-task`` example gets details about a workflow task. ::

    aws omics get-run-task \
        --id 1234567 \
        --task-id 1234567

Output::

    {
        "cpus": 1,
        "creationTime": "2022-11-30T23:13:00.718651Z",
        "logStream": "arn:aws:logs:us-west-2:123456789012:log-group:/aws/omics/WorkflowLog:log-stream:run/1234567/task/1234567",
        "memory": 15,
        "name": "CramToBamTask",
        "startTime": "2022-11-30T23:17:47.016Z",
        "status": "COMPLETED",
        "stopTime": "2022-11-30T23:18:21.503Z",
        "taskId": "1234567"
    }

For more information, see `Task lifecycle in a HealthOmics run <https://docs.aws.amazon.com/omics/latest/dev/workflow-run-tasks.html>`__ in the *AWS HealthOmics User Guide*.
