**To delete a subnet group**

The following ``delete-subnet-group`` example deletes the specified DAX subnet group. ::

    aws dax delete-subnet-group \
        --subnet-group-name daxSubnetGroup

Output::

    {
        "DeletionMessage": "Subnet group daxSubnetGroup has been deleted."
    }

For more information, see `Managing DAX Clusters <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.cluster-management.html>`__ in the *Amazon DynamoDB Developer Guide*.
