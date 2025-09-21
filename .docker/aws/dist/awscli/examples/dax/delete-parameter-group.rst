**To delete a parameter group**

The following ``delete-parameter-group`` example deletes the specified DAX parameter group. ::

    aws dax  delete-parameter-group \
        --parameter-group-name daxparametergroup

Output::

    {
        "DeletionMessage": "Parameter group daxparametergroup has been deleted."
    }

For more information, see `Managing DAX Clusters <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.cluster-management.html>`__ in the *Amazon DynamoDB Developer Guide*.
