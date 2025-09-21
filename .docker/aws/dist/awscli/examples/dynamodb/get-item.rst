**Example 1: To read an item in a table**

The following ``get-item`` example retrieves an item from the ``MusicCollection`` table. The table has a hash-and-range primary key (``Artist`` and ``SongTitle``), so you must specify both of these attributes. The command also requests information about the read capacity consumed by the operation. ::

    aws dynamodb get-item \
        --table-name MusicCollection \
        --key file://key.json \
        --return-consumed-capacity TOTAL

Contents of ``key.json``::

    {
        "Artist": {"S": "Acme Band"},
        "SongTitle": {"S": "Happy Day"}
    }

Output::

    {
        "Item": {
            "AlbumTitle": {
                "S": "Songs About Life"
            }, 
            "SongTitle": {
                "S": "Happy Day"
            }, 
            "Artist": {
                "S": "Acme Band"
            }
        },
        "ConsumedCapacity": {
            "TableName": "MusicCollection",
            "CapacityUnits": 0.5
        }
    }

For more information, see `Reading an Item <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.ReadingData>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 2: To read an item using a consistent read**

The following example retrieves an item from the ``MusicCollection`` table using strongly consistent reads. ::

    aws dynamodb get-item \
        --table-name MusicCollection \
        --key file://key.json \
        --consistent-read \
        --return-consumed-capacity TOTAL

Contents of ``key.json``::

    {
        "Artist": {"S": "Acme Band"},
        "SongTitle": {"S": "Happy Day"}
    }

Output::

    {
        "Item": {
            "AlbumTitle": {
                "S": "Songs About Life"
            }, 
            "SongTitle": {
                "S": "Happy Day"
            }, 
            "Artist": {
                "S": "Acme Band"
            }
        },
        "ConsumedCapacity": {
            "TableName": "MusicCollection",
            "CapacityUnits": 1.0
        }
    }

For more information, see `Reading an Item <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.ReadingData>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 3: To retrieve specific attributes of an item**

The following example uses a projection expression to retrieve only three attributes of the desired item. ::

    aws dynamodb get-item \
        --table-name ProductCatalog \
        --key '{"Id": {"N": "102"}}' \
        --projection-expression "#T, #C, #P" \
        --expression-attribute-names file://names.json

Contents of ``names.json``::

    {
        "#T": "Title",
        "#C": "ProductCategory",
        "#P": "Price"
    }

Output::

    {
        "Item": {
            "Price": {
                "N": "20"
            },
            "Title": {
                "S": "Book 102 Title"
            },
            "ProductCategory": {
                "S": "Book"
            }
        }
    }

For more information, see `Reading an Item <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.ReadingData>`__ in the *Amazon DynamoDB Developer Guide*.