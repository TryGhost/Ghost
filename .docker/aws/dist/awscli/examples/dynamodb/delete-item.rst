**Example 1: To delete an item**

The following ``delete-item`` example deletes an item from the ``MusicCollection`` table and requests details about the item that was deleted and the capacity used by the request. ::

    aws dynamodb delete-item \
        --table-name MusicCollection \
        --key file://key.json \
        --return-values ALL_OLD \
        --return-consumed-capacity TOTAL \
        --return-item-collection-metrics SIZE

Contents of ``key.json``::

    {
        "Artist": {"S": "No One You Know"},
        "SongTitle": {"S": "Scared of My Shadow"}
    }

Output::

    {
        "Attributes": {
            "AlbumTitle": {
                "S": "Blue Sky Blues"
            },
            "Artist": {
                "S": "No One You Know"
            },
            "SongTitle": {
                "S": "Scared of My Shadow"
            }
        },
        "ConsumedCapacity": {
            "TableName": "MusicCollection",
            "CapacityUnits": 2.0
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

**Example 2: To delete an item conditionally**

The following example deletes an item from the ``ProductCatalog`` table only if its ``ProductCategory`` is either ``Sporting Goods`` or ``Gardening Supplies`` and its price is between 500 and 600. It returns details about the item that was deleted. ::

    aws dynamodb delete-item \
        --table-name ProductCatalog \
        --key '{"Id":{"N":"456"}}' \
        --condition-expression "(ProductCategory IN (:cat1, :cat2)) and (#P between :lo and :hi)" \
        --expression-attribute-names file://names.json \
        --expression-attribute-values file://values.json \
        --return-values ALL_OLD

Contents of ``names.json``::

    {
        "#P": "Price"
    }

Contents of ``values.json``::

    {
        ":cat1": {"S": "Sporting Goods"},
        ":cat2": {"S": "Gardening Supplies"},
        ":lo": {"N": "500"},
        ":hi": {"N": "600"}
    }

Output::

    {
        "Attributes": {
            "Id": {
                "N": "456"
            },
            "Price": {
                "N": "550"
            },
            "ProductCategory": {
                "S": "Sporting Goods"
            }
        }
    }

For more information, see `Writing an Item <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.WritingData>`__ in the *Amazon DynamoDB Developer Guide*.
