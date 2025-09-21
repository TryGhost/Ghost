**To get a shard iterator**

The following ``get-shard-iterator`` command retrieves a shard iterator for the specified shard. ::

    aws dynamodbstreams get-shard-iterator \
        --stream-arn arn:aws:dynamodb:us-west-1:12356789012:table/Music/stream/2019-10-22T18:02:01.576 \
        --shard-id shardId-00000001571780995058-40810d86 \
        --shard-iterator-type LATEST

Output::

    {
        "ShardIterator": "arn:aws:dynamodb:us-west-1:123456789012:table/Music/stream/2019-10-22T18:02:01.576|1|AAAAAAAAAAGgM3YZ89vLZZxjmoQeo33r9M4x3+zmmTLsiL86MfrF4+B4EbsByi52InVmiONmy6xVW4IRcIIbs1zO7MNIlqZfx8WQzMwVDyINtGG2hCLg78JKbYxFasXeePGlApTyf3rJxR765uyOVaBvBHAJuwF2TXIuxhaAlOupNGHr52qAC3a49ZOmf+CjNPlqQjnyRSAnfOwWmKhL1/KNParWSfz2odf780oOObIDIWRRMkt7+Hyzh9SD+hFxFAWR5C7QIlOXPc8mRBfNIazfrVCjJK8/jsjCzsqNyXKzJbhh+GXCoxYN+Kpmg4nyj1EAsYhbGL35muvHFoHjcyuynbsczbWaXNfThDwRAyvoTmc8XhHKtAWUbJiaVd8ZPtQwDsThCrmDRPIdmTRGWllGfUr5ezN5LscvkQezzgpaU5p8BgCqRzjv5Vl8LB6wHgQWNG+w/lEGS05ha1qNP+Vl4+tuhz2TRnhnJo/pny9GI/yGpce97mWvSPr5KPwy+Dtcm5BHayBs+PVYHITaTliInFlT+LCwvaz1QH3MY3b8A05Z800wjpktm60iQqtMeDwN4NX6FrcxR34JoFKGsgR8XkHVJzz2xr1xqSJ12ycpNTyHnndusw=="
    }

For more information, see `Capturing Table Activity with DynamoDB Streams <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html>`__ in the *Amazon DynamoDB Developer Guide*.
