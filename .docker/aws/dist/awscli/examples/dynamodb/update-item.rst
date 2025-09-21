**Example 1: To update an item in a table**

The following ``update-item`` example updates an item in the ``MusicCollection`` table. It adds a new attribute (``Year``) and modifies the ``AlbumTitle`` attribute. All of the attributes in the item, as they appear after the update, are returned in the response. ::

    aws dynamodb update-item \
        --table-name MusicCollection \
        --key file://key.json \
        --update-expression "SET #Y = :y, #AT = :t" \
        --expression-attribute-names file://expression-attribute-names.json \
        --expression-attribute-values file://expression-attribute-values.json  \
        --return-values ALL_NEW \
        --return-consumed-capacity TOTAL \
        --return-item-collection-metrics SIZE

Contents of ``key.json``::

    {
        "Artist": {"S": "Acme Band"},
        "SongTitle": {"S": "Happy Day"}
    }

Contents of ``expression-attribute-names.json``::

    {
        "#Y":"Year", "#AT":"AlbumTitle"
    }

Contents of ``expression-attribute-values.json``::

    {
        ":y":{"N": "2015"},
        ":t":{"S": "Louder Than Ever"}
    }

Output::

    {
        "Attributes": {
            "AlbumTitle": {
                "S": "Louder Than Ever"
            },
            "Awards": {
                "N": "10"
            },
            "Artist": {
                "S": "Acme Band"
            },
            "Year": {
                "N": "2015"
            },
            "SongTitle": {
                "S": "Happy Day"
            }
        },
        "ConsumedCapacity": {
            "TableName": "MusicCollection",
            "CapacityUnits": 3.0
        },
        "ItemCollectionMetrics": {
            "ItemCollectionKey": {
                "Artist": {
                    "S": "Acme Band"
                }
            },
            "SizeEstimateRangeGB": [
                0.0,
                1.0
            ]
        }
    }

For more information, see `Writing an Item <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.WritingData>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 2: To update an item conditionally**

The following example updates an item in the ``MusicCollection`` table, but only if the existing item does not already have a ``Year`` attribute. ::

    aws dynamodb update-item \
        --table-name MusicCollection \
        --key file://key.json \
        --update-expression "SET #Y = :y, #AT = :t" \
        --expression-attribute-names file://expression-attribute-names.json \
        --expression-attribute-values file://expression-attribute-values.json  \
        --condition-expression "attribute_not_exists(#Y)"

Contents of ``key.json``::

    {
        "Artist": {"S": "Acme Band"},
        "SongTitle": {"S": "Happy Day"}
    }

Contents of ``expression-attribute-names.json``::

    {
        "#Y":"Year",
        "#AT":"AlbumTitle"
    }

Contents of ``expression-attribute-values.json``::

    {
        ":y":{"N": "2015"},
        ":t":{"S": "Louder Than Ever"}
    }

If the item already has a ``Year`` attribute, DynamoDB returns the following output. ::

    An error occurred (ConditionalCheckFailedException) when calling the UpdateItem operation: The conditional request failed

For more information, see `Writing an Item <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.WritingData>`__ in the *Amazon DynamoDB Developer Guide*.