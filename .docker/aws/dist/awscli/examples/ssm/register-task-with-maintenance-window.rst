**Example 1: To register an Automation task with a maintenance window**

The following ``register-task-with-maintenance-window`` example registers an Automation task with a maintenance window that is targeted at an instance. ::

    aws ssm register-task-with-maintenance-window \
        --cli-binary-format raw-in-base64-out \
        --window-id "mw-082dcd7649EXAMPLE" \
        --targets Key=InstanceIds,Values=i-1234520122EXAMPLE \
        --task-arn AWS-RestartEC2Instance \
        --service-role-arn arn:aws:iam::111222333444:role/SSM --task-type AUTOMATION \
        --task-invocation-parameters "{\"Automation\":{\"DocumentVersion\":\"\$LATEST\",\"Parameters\":{\"InstanceId\":[\"{{RESOURCE_ID}}\"]}}}" \
        --priority 0 \
        --max-concurrency 1 \
        --max-errors 1 \
        --name "AutomationExample" \
        --description "Restarting EC2 Instance for maintenance"

Output::

    {
        "WindowTaskId":"11144444-5555-6666-7777-88888888"
    }

For more information, see `Register a Task with the Maintenance Window (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/mw-cli-tutorial-tasks.html>`__ in the *AWS Systems Manager User Guide*.

**Example 2: To register a Lambda task with a Maintenance Window**

The following ``register-task-with-maintenance-window`` example registers a Lambda task with a Maintenance Window that is targeted at an instance. ::

    aws ssm register-task-with-maintenance-window \
        --cli-binary-format raw-in-base64-out \
        --window-id "mw-082dcd7649dee04e4" \
        --targets Key=InstanceIds,Values=i-12344d305eEXAMPLE \
        --task-arn arn:aws:lambda:us-east-1:111222333444:function:SSMTestLAMBDA \
        --service-role-arn arn:aws:iam::111222333444:role/SSM \
        --task-type LAMBDA \
        --task-invocation-parameters '{"Lambda":{"Payload":"{\"InstanceId\":\"{{RESOURCE_ID}}\",\"targetType\":\"{{TARGET_TYPE}}\"}","Qualifier":"$LATEST"}}' \
        --priority 0 \
        --max-concurrency 10 \
        --max-errors 5 \
        --name "Lambda_Example" \
        --description "My Lambda Example"

Output::

    {
        "WindowTaskId":"22244444-5555-6666-7777-88888888"
    }

For more information, see `Register a Task with the Maintenance Window (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/mw-cli-tutorial-tasks.html>`__ in the *AWS Systems Manager User Guide*.

**Example 3: To register a Run Command task with a maintenance window**

The following ``register-task-with-maintenance-window`` example registers a Run Command task with a maintenance window that is targeted at an instance. ::

    aws ssm register-task-with-maintenance-window \
        --cli-binary-format raw-in-base64-out \
        --window-id "mw-082dcd7649dee04e4" \
        --targets "Key=InstanceIds,Values=i-12344d305eEXAMPLE" \
        --service-role-arn "arn:aws:iam::111222333444:role/SSM" \
        --task-type "RUN_COMMAND" \
        --name "SSMInstallPowerShellModule" \
        --task-arn "AWS-InstallPowerShellModule" \
        --task-invocation-parameters "{\"RunCommand\":{\"Comment\":\"\",\"OutputS3BucketName\":\"runcommandlogs\",\"Parameters\":{\"commands\":[\"Get-Module -ListAvailable\"],\"executionTimeout\":[\"3600\"],\"source\":[\"https:\/\/gallery.technet.microsoft.com\/EZOut-33ae0fb7\/file\/110351\/1\/EZOut.zip\"],\"workingDirectory\":[\"\\\\\"]},\"TimeoutSeconds\":600}}" \
        --max-concurrency 1 \
        --max-errors 1 \
        --priority 10

Output::

    {
        "WindowTaskId":"33344444-5555-6666-7777-88888888"
    }

For more information, see `Register a Task with the Maintenance Window (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/mw-cli-tutorial-tasks.html>`__ in the *AWS Systems Manager User Guide*.

**Example 4: To register a Step Functions task with a maintenance window**

The following ``register-task-with-maintenance-window`` example registers a Step Functions task with a maintenance window that is targeted at an instance. ::

    aws ssm register-task-with-maintenance-window \
        --cli-binary-format raw-in-base64-out \
        --window-id "mw-1234d787d6EXAMPLE" \
        --targets Key=WindowTargetIds,Values=12347414-69c3-49f8-95b8-ed2dcEXAMPLE \
        --task-arn arn:aws:states:us-east-1:111222333444:stateMachine:SSMTestStateMachine \
        --service-role-arn arn:aws:iam::111222333444:role/MaintenanceWindows \
        --task-type STEP_FUNCTIONS \
        --task-invocation-parameters '{"StepFunctions":{"Input":"{\"InstanceId\":\"{{RESOURCE_ID}}\"}"}}' \
        --priority 0 \
        --max-concurrency 10 \
        --max-errors 5 \
        --name "Step_Functions_Example" \
        --description "My Step Functions Example"

Output::

    {
        "WindowTaskId":"44444444-5555-6666-7777-88888888"
    }

For more information, see `Register a Task with the Maintenance Window (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/mw-cli-tutorial-tasks.html>`__ in the *AWS Systems Manager User Guide*.

**Example 5: To register a task using a maintenance windows target ID**

The following ``register-task-with-maintenance-window`` example registers a task using a maintenance window target ID. The maintenance window target ID was in the output of the ``aws ssm register-target-with-maintenance-window`` command. You can also retrieve it from the output of the ``aws ssm describe-maintenance-window-targets`` command. ::

    aws ssm register-task-with-maintenance-window \
        --cli-binary-format raw-in-base64-out \
        --targets "Key=WindowTargetIds,Values=350d44e6-28cc-44e2-951f-4b2c9EXAMPLE" \
        --task-arn "AWS-RunShellScript" \
        --service-role-arn "arn:aws:iam::111222333444:role/MaintenanceWindowsRole" \
        --window-id "mw-ab12cd34eEXAMPLE" \
        --task-type "RUN_COMMAND" \
        --task-parameters  "{\"commands\":{\"Values\":[\"df\"]}}" \
        --max-concurrency 1 \
        --max-errors 1 \
        --priority 10

Output::

    {
        "WindowTaskId":"33344444-5555-6666-7777-88888888"
    }

For more information, see `Register a Task with the Maintenance Window (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/mw-cli-tutorial-tasks.html>`__ in the *AWS Systems Manager User Guide*.
