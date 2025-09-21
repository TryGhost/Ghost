**To update security control properties**

The following ``update-security-control`` example specifies custom values for a Security Hub security control parameter. ::

    aws securityhub update-security-control \
        --security-control-id ACM.1 \
        --parameters '{"daysToExpiration": {"ValueType": "CUSTOM", "Value": {"Integer": 15}}}' \
        --last-update-reason "Internal compliance requirement"

This command produces no output.

For more information, see `Custom control parameters <https://docs.aws.amazon.com/securityhub/latest/userguide/custom-control-parameters.html>`__ in the *AWS Security Hub User Guide*.