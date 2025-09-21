**To create an audit finding suppression**

The following ``create-audit-suppression`` example creates an audit finding suppression for a policy named "virtualMachinePolicy" that has been flagged for being overly permissive.  ::

    aws iot create-audit-suppression \
        --check-name IOT_POLICY_OVERLY_PERMISSIVE_CHECK \
        --resource-identifier policyVersionIdentifier={"policyName"="virtualMachinePolicy","policyVersionId"="1"} \
        --no-suppress-indefinitely \ 
        --expiration-date 2020-10-20

This command produces no output.

For more information, see `Audit finding suppressions <https://docs.aws.amazon.com/iot/latest/developerguide/audit-finding-suppressions.html>`__ in the *AWS IoT Developers Guide*.