**To get records from a Dynamodb stream**

The following ``get-records`` command retrieves records using the specified Amazon DynamoDB shard iterator. ::

    aws dynamodbstreams get-records \
        --shard-iterator "arn:aws:dynamodb:us-west-1:123456789012:table/Music/stream/2019-10-22T18:02:01.576|1|AAAAAAAAAAGgM3YZ89vLZZxjmoQeo33r9M4x3+zmmTLsiL86MfrF4+B4EbsByi52InVmiONmy6xVW4IRcIIbs1zO7MNIlqZfx8WQzMwVDyINtGG2hCLg78JKbYxFasXeePGlApTyf3rJxR765uyOVaBvBHAJuwF2TXIuxhaAlOupNGHr52qAC3a49ZOmf+CjNPlqQjnyRSAnfOwWmKhL1/KNParWSfz2odf780oOObIDIWRRMkt7+Hyzh9SD+hFxFAWR5C7QIlOXPc8mRBfNIazfrVCjJK8/jsjCzsqNyXKzJbhh+GXCoxYN+Kpmg4nyj1EAsYhbGL35muvHFoHjcyuynbsczbWaXNfThDwRAyvoTmc8XhHKtAWUbJiaVd8ZPtQwDsThCrmDRPIdmTRGWllGfUr5ezN5LscvkQezzgpaU5p8BgCqRzjv5Vl8LB6wHgQWNG+w/lEGS05ha1qNP+Vl4+tuhz2TRnhnJo/pny9GI/yGpce97mWvSPr5KPwy+Dtcm5BHayBs+PVYHITaTliInFlT+LCwvaz1QH3MY3b8A05Z800wjpktm60iQqtMeDwN4NX6FrcxR34JoFKGsgR8XkHVJzz2xr1xqSJ12ycpNTyHnndusw=="

Output::

    {
        "Records": [
            {
                "eventID": "c3b5d798eef6215d42f8137b19a88e50",
                "eventName": "INSERT",
                "eventVersion": "1.1",
                "eventSource": "aws:dynamodb",
                "awsRegion": "us-west-1",
                "dynamodb": {
                    "ApproximateCreationDateTime": 1571849028.0,
                    "Keys": {
                        "Artist": {
                            "S": "No One You Know"
                        },
                        "SongTitle": {
                            "S": "Call Me Today"
                        }
                    },
                    "NewImage": {
                        "AlbumTitle": {
                            "S": "Somewhat Famous"
                        },
                        "Artist": {
                            "S": "No One You Know"
                        },
                        "Awards": {
                            "N": "1"
                        },
                        "SongTitle": {
                            "S": "Call Me Today"
                        }
                    },
                    "SequenceNumber": "700000000013256296913",
                    "SizeBytes": 119,
                    "StreamViewType": "NEW_AND_OLD_IMAGES"
                }
            },
            {
                "eventID": "878960a6967867e2da16b27380a27328",
                "eventName": "INSERT",
                "eventVersion": "1.1",
                "eventSource": "aws:dynamodb",
                "awsRegion": "us-west-1",
                "dynamodb": {
                    "ApproximateCreationDateTime": 1571849029.0,
                    "Keys": {
                        "Artist": {
                            "S": "Acme Band"
                        },
                        "SongTitle": {
                            "S": "Happy Day"
                        }
                    },
                    "NewImage": {
                        "AlbumTitle": {
                            "S": "Songs About Life"
                        },
                        "Artist": {
                            "S": "Acme Band"
                        },
                        "Awards": {
                            "N": "10"
                        },
                        "SongTitle": {
                            "S": "Happy Day"
                        }
                    },
                    "SequenceNumber": "800000000013256297217",
                    "SizeBytes": 100,
                    "StreamViewType": "NEW_AND_OLD_IMAGES"
                }
            },
            {
                "eventID": "520fabde080e159fc3710b15ee1d4daa",
                "eventName": "MODIFY",
                "eventVersion": "1.1",
                "eventSource": "aws:dynamodb",
                "awsRegion": "us-west-1",
                "dynamodb": {
                    "ApproximateCreationDateTime": 1571849734.0,
                    "Keys": {
                        "Artist": {
                            "S": "Acme Band"
                        },
                        "SongTitle": {
                            "S": "Happy Day"
                        }
                    },
                    "NewImage": {
                        "AlbumTitle": {
                            "S": "Updated Album Title"
                        },
                        "Artist": {
                            "S": "Acme Band"
                        },
                        "Awards": {
                            "N": "10"
                        },
                        "SongTitle": {
                            "S": "Happy Day"
                        }
                    },
                    "OldImage": {
                        "AlbumTitle": {
                            "S": "Songs About Life"
                        },
                        "Artist": {
                            "S": "Acme Band"
                        },
                        "Awards": {
                            "N": "10"
                        },
                        "SongTitle": {
                            "S": "Happy Day"
                        }
                    },
                    "SequenceNumber": "900000000013256687845",
                    "SizeBytes": 170,
                    "StreamViewType": "NEW_AND_OLD_IMAGES"
                }
            }
        ],
        "NextShardIterator": "arn:aws:dynamodb:us-west-1:123456789012:table/Music/stream/2019-10-23T16:41:08.740|1|AAAAAAAAAAEhEI04jkFLW+LKOwivjT8d/IHEh3iExV2xK00aTxEzVy1C1C7Kbb5+ZOW6bT9VQ2n1/mrs7+PRiaOZCHJu7JHJVW7zlsqOi/ges3fw8GYEymyL+piEk35cx67rQqwKKyq+Q6w9JyjreIOj4F2lWLV26lBwRTrIYC4IB7C3BZZK4715QwYdDxNdVHiSBRZX8UqoS6WOt0F87xZLNB9F/NhYBLXi/wcGvAcBcC0TNIOH+N0NqwtoB/FGCkNrf8YZ0xRoNN6RgGuVWHF3pxOhxEJeFZoSoJTIKeG9YcYxzi5Ci/mhdtm7tBXnbw5c6xmsGsBqTirNjlDyJLcWl8Cl0UOLX63Ufo/5QliztcjEbKsQe28x8LM8o7VH1Is0fF/ITt8awSA4igyJS0P87GN8Qri8kj8iaE35805jBHWF2wvwT6Iy2xGrR2r2HzYps9dwGOarVdEITaJfWzNoL4HajMhmREZLYfM7Pb0PvRMO7JkENyPIU6e2w16W1CvJO2EGFIxtNk+V04i1YIeHMXJfcwetNRuIbdQXfJht2NQZa4PVV6iknY6d19MrdbSTMKoqAuvp6g3Q2jH4t7GKCLWgodcPAn8g5+43DaNkh4Z5zKOfNw=="
    }  

For more information, see `Capturing Table Activity with DynamoDB Streams <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html>`__ in the *Amazon DynamoDB Developer Guide*.
