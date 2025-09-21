**To delete a related item association**

The following ``disassociate-ops-item-related-item`` example deletes the association between the OpsItem and a related item. ::

    aws ssm disassociate-ops-item-related-item \
        --ops-item-id "oi-f99f2EXAMPLE" \
        --association-id "e2036148-cccb-490e-ac2a-390e5EXAMPLE"

This command produces no output.

For more information, see `Working with Incident Manager incidents in OpsCenter <https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-create-OpsItems-for-Incident-Manager.html>`__ in the *AWS Systems Manager User Guide*.