**Example 1: To add an item to a table**

The following ``put-item`` example adds a new item to the *MusicCollection* table. ::

    aws dynamodb put-item \
        --table-name MusicCollection \
        --item file://item.json \
        --return-consumed-capacity TOTAL \
        --return-item-collection-metrics SIZE

Contents of ``item.json``::

    {
        "Artist": {"S": "No One You Know"},
        "SongTitle": {"S": "Call Me Today"},
        "AlbumTitle": {"S": "Greatest Hits"}
    }

Output::

    {
        "ConsumedCapacity": {
            "TableName": "MusicCollection",
            "CapacityUnits": 1.0
        },
        "ItemCollectionMetrics": {
            "ItemCollectionKey": {
                "Artist": {
                    "S": "No One You Know"
                }
            },
            "SizeEstimateRangeGB": [
                0.0,
                1.0
            ]
        }
    }

For more information, see `Writing an Item <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.WritingData>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 2: To conditionally overwrite an item in a table**

The following ``put-item`` example overwrites an existing item in the ``MusicCollection`` table only if that existing item has an ``AlbumTitle`` attribute with a value of ``Greatest Hits``. The command returns the previous value of the item. ::

    aws dynamodb put-item \
        --table-name MusicCollection \
        --item file://item.json \
        --condition-expression "#A = :A" \
        --expression-attribute-names file://names.json \
        --expression-attribute-values file://values.json \
        --return-values ALL_OLD

Contents of ``item.json``::

    {
        "Artist": {"S": "No One You Know"},
        "SongTitle": {"S": "Call Me Today"},
        "AlbumTitle": {"S": "Somewhat Famous"}
    }

Contents of ``names.json``::

    {
        "#A": "AlbumTitle"
    }

Contents of ``values.json``::

    {
        ":A": {"S": "Greatest Hits"}
    }

Output::

    {
        "Attributes": {
            "AlbumTitle": {
                "S": "Greatest Hits"
            },
            "Artist": {
                "S": "No One You Know"
            },
            "SongTitle": {
                "S": "Call Me Today"
            }
        }
    }

If the key already exists, you should see the following output::

    A client error (ConditionalCheckFailedException) occurred when calling the PutItem operation: The conditional request failed.

For more information, see `Writing an Item <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.WritingData>`__ in the *Amazon DynamoDB Developer Guide*.

