**To return a list of engine versions**

The following `describe-engine-versions`` returns a list of engine versions. ::

    aws memorydb describe-engine-versions

Output::

    {
        "EngineVersions": [
            {
                "EngineVersion": "6.2",
                "EnginePatchVersion": "6.2.6",
                "ParameterGroupFamily": "memorydb_redis6"
            }
        ]
    }

For more information, see `Engine versions and upgrading <https://docs.aws.amazon.com/memorydb/latest/devguide/engine-versions.htmll>`__ in the *MemoryDB User Guide*.
