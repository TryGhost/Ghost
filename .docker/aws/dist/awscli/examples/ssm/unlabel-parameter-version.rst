**To delete parameter labels**

The following ``unlabel-parameter-version`` example deletes the specified labels from the given parameter version. ::

    aws ssm unlabel-parameter-version \
        --name "parameterName" \
        --parameter-version "version" \
        --labels "label_1" "label_2" "label_3"

Output::

    {
        "RemovedLabels": [
            "label_1"
            "label_2"
            "label_3"
        ],
        "InvalidLabels": []
    }

For more information, see `Delete parameter labels (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-labels.html#systems-manager-parameter-store-labels-cli-delete>`__ in the *AWS Systems Manager User Guide*.