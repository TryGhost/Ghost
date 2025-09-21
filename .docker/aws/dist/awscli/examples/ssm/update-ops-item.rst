**To update an OpsItem**

The following ``update-ops-item`` example updates the description, priority, and category for an OpsItem. In addition, the command specifies an SNS topic where the notifications are sent when this OpsItem is edited or changed. ::

    aws ssm update-ops-item \
        --ops-item-id "oi-287b5EXAMPLE" \
        --description "Primary OpsItem for failover event 2020-01-01-fh398yf" \
        --priority 2 \
        --category "Security" \
        --notifications "Arn=arn:aws:sns:us-east-2:111222333444:my-us-east-2-topic"

Output::

    This command produces no output.

For more information, see `Working with OpsItems <https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-working-with-OpsItems.html>`__ in the *AWS Systems Manager User Guide*.
