**To display the details of a command invocation**

The following ``get-command-invocation`` example lists all the invocations of the specified command on the specified instance. ::

    aws ssm get-command-invocation \
        --command-id "ef7fdfd8-9b57-4151-a15c-db9a12345678" \
        --instance-id "i-1234567890abcdef0"

Output::

    {
        "CommandId": "ef7fdfd8-9b57-4151-a15c-db9a12345678",
        "InstanceId": "i-1234567890abcdef0",
        "Comment": "b48291dd-ba76-43e0-b9df-13e11ddaac26:6960febb-2907-4b59-8e1a-d6ce8EXAMPLE",
        "DocumentName": "AWS-UpdateSSMAgent",
        "DocumentVersion": "",
        "PluginName": "aws:updateSsmAgent",
        "ResponseCode": 0,
        "ExecutionStartDateTime": "2020-02-19T18:18:03.419Z",
        "ExecutionElapsedTime": "PT0.091S",
        "ExecutionEndDateTime": "2020-02-19T18:18:03.419Z",
        "Status": "Success",
        "StatusDetails": "Success",
        "StandardOutputContent": "Updating amazon-ssm-agent from 2.3.842.0 to latest\nSuccessfully downloaded https://s3.us-east-2.amazonaws.com/amazon-ssm-us-east-2/ssm-agent-manifest.json\namazon-ssm-agent 2.3.842.0 has already been installed, update skipped\n",
        "StandardOutputUrl": "",
        "StandardErrorContent": "",
        "StandardErrorUrl": "",
        "CloudWatchOutputConfig": {
            "CloudWatchLogGroupName": "",
            "CloudWatchOutputEnabled": false
        }
    }

For more information, see `Understanding Command Statuses <https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html>`__ in the *AWS Systems Manager User Guide*.
