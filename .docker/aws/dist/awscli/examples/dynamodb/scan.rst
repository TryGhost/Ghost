**To scan a table**

The following ``scan`` example scans the entire ``MusicCollection`` table, and then narrows the results to songs by the artist "No One You Know". For each item, only the album title and song title are returned. ::

    aws dynamodb scan \
        --table-name MusicCollection \
        --filter-expression "Artist = :a" \
        --projection-expression "#ST, #AT" \
        --expression-attribute-names file://expression-attribute-names.json \
        --expression-attribute-values file://expression-attribute-values.json

Contents of ``expression-attribute-names.json``::

    {
        "#ST": "SongTitle", 
        "#AT":"AlbumTitle"
    }

Contents of ``expression-attribute-values.json``::

    {
        ":a": {"S": "No One You Know"}
    }

Output::

    {
        "Count": 2, 
        "Items": [
            {
                "SongTitle": {
                    "S": "Call Me Today"
                }, 
                "AlbumTitle": {
                    "S": "Somewhat Famous"
                }
            }, 
            {
                "SongTitle": {
                    "S": "Scared of My Shadow"
                }, 
                "AlbumTitle": {
                    "S": "Blue Sky Blues"
                }
            }
        ], 
        "ScannedCount": 3, 
        "ConsumedCapacity": null
    }

For more information, see `Working with Scans in DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html>`__ in the *Amazon DynamoDB Developer Guide*.
