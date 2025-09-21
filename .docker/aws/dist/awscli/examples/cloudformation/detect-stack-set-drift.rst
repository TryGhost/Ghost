**To detect drift on a stack set and all associated stack instances**

The following ``detect-stack-set-drift`` example initiates drift detection operations on the specified stack set, including all the stack instances associated with that stack set, and returns an operation ID that can be used to track the status of the drift operation. ::

    aws cloudformation detect-stack-set-drift \
        --stack-set-name stack-set-drift-example

Output::

    {
        "OperationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Detecting Unmanaged Configuration Changes in Stack Sets <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-drift.html>`__ in the *AWS CloudFormation Users Guide*.
