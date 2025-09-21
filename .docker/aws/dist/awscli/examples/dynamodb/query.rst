**Example 1: To query a table**

The following ``query`` example queries items in the ``MusicCollection`` table. The table has a hash-and-range primary key (``Artist`` and ``SongTitle``), but this query only specifies the hash key value. It returns song titles by the artist named "No One You Know". ::

    aws dynamodb query \
        --table-name MusicCollection \
        --projection-expression "SongTitle" \
        --key-condition-expression "Artist = :v1" \
        --expression-attribute-values file://expression-attributes.json \
        --return-consumed-capacity TOTAL

Contents of ``expression-attributes.json``::

    {
        ":v1": {"S": "No One You Know"}
    }

Output::

    {
        "Items": [
            {
                "SongTitle": {
                    "S": "Call Me Today"
                },
                "SongTitle": {
                    "S": "Scared of My Shadow"
                }
            }
        ],
        "Count": 2,
        "ScannedCount": 2,
        "ConsumedCapacity": {
            "TableName": "MusicCollection",
            "CapacityUnits": 0.5
        }
    }

For more information, see `Working with Queries in DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 2: To query a table using strongly consistent reads and traverse the index in descending order**

The following example performs the same query as the first example, but returns results in reverse order and uses strongly consistent reads. ::

    aws dynamodb query \
        --table-name MusicCollection \
        --projection-expression "SongTitle" \
        --key-condition-expression "Artist = :v1" \
        --expression-attribute-values file://expression-attributes.json \
        --consistent-read \
        --no-scan-index-forward \
        --return-consumed-capacity TOTAL

Contents of ``expression-attributes.json``::

    {
        ":v1": {"S": "No One You Know"}
    }

Output::

    {
        "Items": [
            {
                "SongTitle": {
                    "S": "Scared of My Shadow"
                }
            },
            {
                "SongTitle": {
                    "S": "Call Me Today"
                }
            }
        ],
        "Count": 2,
        "ScannedCount": 2,
        "ConsumedCapacity": {
            "TableName": "MusicCollection",
            "CapacityUnits": 1.0
        }
    }

For more information, see `Working with Queries in DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 3: To filter out specific results**

The following example queries the ``MusicCollection`` but excludes results with specific values in the ``AlbumTitle`` attribute. Note that this does not affect the ``ScannedCount`` or ``ConsumedCapacity``, because the filter is applied after the items have been read. ::

    aws dynamodb query \
        --table-name MusicCollection \
        --key-condition-expression "#n1 = :v1" \
        --filter-expression "NOT (#n2 IN (:v2, :v3))" \
        --expression-attribute-names file://names.json \
        --expression-attribute-values file://values.json \
        --return-consumed-capacity TOTAL

Contents of ``values.json``::

    {
        ":v1": {"S": "No One You Know"},
        ":v2": {"S": "Blue Sky Blues"},
        ":v3": {"S": "Greatest Hits"}
    }

Contents of ``names.json``::

    {
        "#n1": "Artist",
        "#n2": "AlbumTitle"
    }

Output::

    {
        "Items": [
            {
                "AlbumTitle": {
                    "S": "Somewhat Famous"
                },
                "Artist": {
                    "S": "No One You Know"
                },
                "SongTitle": {
                    "S": "Call Me Today"
                }
            }
        ],
        "Count": 1,
        "ScannedCount": 2,
        "ConsumedCapacity": {
            "TableName": "MusicCollection",
            "CapacityUnits": 0.5
        }
    }

For more information, see `Working with Queries in DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 4: To retrieve only an item count**

The following example retrieves a count of items matching the query, but does not retrieve any of the items themselves. ::

    aws dynamodb query \
        --table-name MusicCollection \
        --select COUNT \
        --key-condition-expression "Artist = :v1" \
        --expression-attribute-values file://expression-attributes.json

Contents of ``expression-attributes.json``::

    {
        ":v1": {"S": "No One You Know"}
    }

Output::

    {
        "Count": 2,
        "ScannedCount": 2,
        "ConsumedCapacity": null
    }

For more information, see `Working with Queries in DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 5: To query an index**

The following example queries the local secondary index ``AlbumTitleIndex``. The query returns all attributes from the base table that have been projected into the local secondary index. Note that when querying a local secondary index or global secondary index, you must also provide the name of the base table using the ``table-name`` parameter. ::

    aws dynamodb query \
        --table-name MusicCollection \
        --index-name AlbumTitleIndex \
        --key-condition-expression "Artist = :v1" \
        --expression-attribute-values file://expression-attributes.json \
        --select ALL_PROJECTED_ATTRIBUTES \
        --return-consumed-capacity INDEXES

Contents of ``expression-attributes.json``::

    {
        ":v1": {"S": "No One You Know"}
    }

Output::

    {
        "Items": [
            {
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
            {
                "AlbumTitle": {
                    "S": "Somewhat Famous"
                },
                "Artist": {
                    "S": "No One You Know"
                },
                "SongTitle": {
                    "S": "Call Me Today"
                }
            }
        ],
        "Count": 2,
        "ScannedCount": 2,
        "ConsumedCapacity": {
            "TableName": "MusicCollection",
            "CapacityUnits": 0.5,
            "Table": {
                "CapacityUnits": 0.0
            },
            "LocalSecondaryIndexes": {
                "AlbumTitleIndex": {
                    "CapacityUnits": 0.5
                }
            }
        }
    }

For more information, see `Working with Queries in DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html>`__ in the *Amazon DynamoDB Developer Guide*.