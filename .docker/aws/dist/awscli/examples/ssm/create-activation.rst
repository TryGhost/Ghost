**To create a managed instance activation**

The following ``create-activation`` example creates a managed instance activation. ::

    aws ssm create-activation \
        --default-instance-name "HybridWebServers" \
        --iam-role "HybridWebServersRole" \
        --registration-limit 5

Output::

    {
        "ActivationId": "5743558d-563b-4457-8682-d16c3EXAMPLE",
        "ActivationCode": "dRmgnYaFv567vEXAMPLE"
    }

For more information, see `Step 4: Create a Managed-Instance Activation for a Hybrid Environment <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-managed-instance-activation.html>`__ in the *AWS Systems Manager User Guide*.
