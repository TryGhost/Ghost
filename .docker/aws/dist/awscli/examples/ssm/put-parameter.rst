**Example 1: To change a parameter value**

The following ``put-parameter`` example changes the value of the specified parameter. ::

    aws ssm put-parameter \
        --name "MyStringParameter" \
        --type "String" \
        --value "Vici" \
        --overwrite

Output::

    {
        "Version": 2,
        "Tier": "Standard"
    }

For more information, see `Create a Systems Manager parameter (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/param-create-cli.html>`__, `Managing parameter tiers <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html>`__, and `Working with parameter policies <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-policies.html>`__ in the *AWS Systems Manager User Guide*.

**Example 2: To create an advanced parameter**

The following ``put-parameter`` example creates an advanced parameter. ::

    aws ssm put-parameter \
        --name "MyAdvancedParameter" \
        --description "This is an advanced parameter" \
        --value "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat [truncated]" \
        --type "String" \
        --tier Advanced

Output::

    {
        "Version": 1,
        "Tier": "Advanced"
    }

For more information, see `Create a Systems Manager parameter (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/param-create-cli.html>`__, `Managing parameter tiers <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html>`__, and `Working with parameter policies <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-policies.html>`__ in the *AWS Systems Manager User Guide*.

**Example 3: To convert a standard parameter to an advanced parameter**

The following ``put-parameter`` example converts an existing standard parameter into an advanced parameter. ::

    aws ssm put-parameter \
        --name "MyConvertedParameter" \
        --value "abc123" \
        --type "String" \
        --tier Advanced \
        --overwrite

Output::

    {
        "Version": 2,
        "Tier": "Advanced"
    }

For more information, see `Create a Systems Manager parameter (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/param-create-cli.html>`__, `Managing parameter tiers <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html>`__, and `Working with parameter policies <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-policies.html>`__ in the *AWS Systems Manager User Guide*.

**Example 4: To create a parameter with a policy attached**

The following ``put-parameter`` example creates an advanced parameter with a parameter policy attached. ::

    aws ssm put-parameter \
        --name "/Finance/Payroll/q2accesskey" \
        --value "P@sSwW)rd" \
        --type "SecureString" \
        --tier Advanced \
        --policies "[{\"Type\":\"Expiration\",\"Version\":\"1.0\",\"Attributes\":{\"Timestamp\":\"2020-06-30T00:00:00.000Z\"}},{\"Type\":\"ExpirationNotification\",\"Version\":\"1.0\",\"Attributes\":{\"Before\":\"5\",\"Unit\":\"Days\"}},{\"Type\":\"NoChangeNotification\",\"Version\":\"1.0\",\"Attributes\":{\"After\":\"60\",\"Unit\":\"Days\"}}]"

Output::

    {
        "Version": 1,
        "Tier": "Advanced"
    }

For more information, see `Create a Systems Manager parameter (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/param-create-cli.html>`__, `Managing parameter tiers <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html>`__, and `Working with parameter policies <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-policies.html>`__ in the *AWS Systems Manager User Guide*.

**Example 5: To add a policy to an existing parameter**

The following ``put-parameter`` example attaches a policy to an existing advanced parameter. ::

    aws ssm put-parameter \
        --name "/Finance/Payroll/q2accesskey" \
        --value "N3wP@sSwW)rd" \
        --type "SecureString" \
        --tier Advanced \
        --policies "[{\"Type\":\"Expiration\",\"Version\":\"1.0\",\"Attributes\":{\"Timestamp\":\"2020-06-30T00:00:00.000Z\"}},{\"Type\":\"ExpirationNotification\",\"Version\":\"1.0\",\"Attributes\":{\"Before\":\"5\",\"Unit\":\"Days\"}},{\"Type\":\"NoChangeNotification\",\"Version\":\"1.0\",\"Attributes\":{\"After\":\"60\",\"Unit\":\"Days\"}}]" 
        --overwrite

Output::

    {
        "Version": 2,
        "Tier": "Advanced"
    }

For more information, see `Create a Systems Manager parameter (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/param-create-cli.html>`__, `Managing parameter tiers <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html>`__, and `Working with parameter policies <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-policies.html>`__ in the *AWS Systems Manager User Guide*.