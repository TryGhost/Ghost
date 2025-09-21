**Example 1: To list tables**

The following ``list-tables`` example lists all of the tables associated with the current AWS account and Region. ::

    aws dynamodb list-tables

Output::

    {
        "TableNames": [
            "Forum",
            "ProductCatalog",
            "Reply",
            "Thread"
        ]
    }

For more information, see `Listing Table Names <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.ListTables>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 2: To limit page size**

The following example returns a list of all existing tables, but retrieves only one item in each call, performing multiple calls if necessary to get the entire list. Limiting the page size is useful when running list commands on a large number of resources, which can result in a "timed out" error when using the default page size of 1000. ::

    aws dynamodb list-tables \
        --page-size 1

Output::

    {
        "TableNames": [
            "Forum",
            "ProductCatalog",
            "Reply",
            "Thread"
        ]
    }

For more information, see `Listing Table Names <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.ListTables>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 3: To limit the number of items returned**

The following example limits the number of items returned to 2. The response includes a ``NextToken`` value with which to retrieve the next page of results. ::

    aws dynamodb list-tables \
        --max-items 2

Output::

    {
        "TableNames": [
            "Forum",
            "ProductCatalog"
        ],
        "NextToken": "abCDeFGhiJKlmnOPqrSTuvwxYZ1aBCdEFghijK7LM51nOpqRSTuv3WxY3ZabC5dEFGhI2Jk3LmnoPQ6RST9"
    }

For more information, see `Listing Table Names <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.ListTables>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 4: To retrieve the next page of results**

The following command uses the ``NextToken`` value from a previous call to the ``list-tables`` command to retrieve another page of results. Since the response in this case does not include a ``NextToken`` value, we know that we have reached the end of the results. ::

    aws dynamodb list-tables \
        --starting-token abCDeFGhiJKlmnOPqrSTuvwxYZ1aBCdEFghijK7LM51nOpqRSTuv3WxY3ZabC5dEFGhI2Jk3LmnoPQ6RST9

Output::

    {
        "TableNames": [
            "Reply",
            "Thread"
        ]
    }

For more information, see `Listing Table Names <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.ListTables>`__ in the *Amazon DynamoDB Developer Guide*.