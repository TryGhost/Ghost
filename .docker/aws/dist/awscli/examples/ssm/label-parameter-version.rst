**Example 1: To add a label to latest version of a parameter**

The following ``label-parameter-version`` example adds a label to the latest version of the specified parameter. ::

    aws ssm label-parameter-version \
        --name "MyStringParameter" \
        --labels "ProductionReady"

Output::

    {
        "InvalidLabels": [],
        "ParameterVersion": 3
    }

For more information, see `Working with parameter labels <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-labels.html>`__ in the *AWS Systems Manager User Guide*.

**Example 2: To add a label to a specific version of a parameter**

The following ``label-parameter-version`` example adds a label to the specified version of a parameter. ::

    aws ssm label-parameter-version \
        --name "MyStringParameter" \
        --labels "ProductionReady" \
        --parameter-version "2" --labels "DevelopmentReady"

For more information, see `Working with parameter labels <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-labels.html>`__ in the *AWS Systems Manager User Guide*.
