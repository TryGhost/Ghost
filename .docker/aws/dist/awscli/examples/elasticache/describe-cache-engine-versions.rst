**To describe a cache engine version**

The following ``describe-cache-engine-versions`` example returns a list of the available cache engines and their versions. :: 

    aws elasticache describe-cache-engine-versions \
        --engine "Redis"

Output::

    {
        "CacheEngineVersions": [
            {
                "Engine": "redis",
                "EngineVersion": "2.6.13",
                "CacheParameterGroupFamily": "redis2.6",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 2.6.13"
            },
            {
                "Engine": "redis",
                "EngineVersion": "2.8.19",
                "CacheParameterGroupFamily": "redis2.8",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 2.8.19"
            },
            {
                "Engine": "redis",
                "EngineVersion": "2.8.21",
                "CacheParameterGroupFamily": "redis2.8",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 2.8.21"
            },
            {
                "Engine": "redis",
                "EngineVersion": "2.8.22",
                "CacheParameterGroupFamily": "redis2.8",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 2.8.22"
            },
            {
                "Engine": "redis",
                "EngineVersion": "2.8.23",
                "CacheParameterGroupFamily": "redis2.8",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 2.8.23"
            },
            {
                "Engine": "redis",
                "EngineVersion": "2.8.24",
                "CacheParameterGroupFamily": "redis2.8",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 2.8.24"
            },
            {
                "Engine": "redis",
                "EngineVersion": "2.8.6",
                "CacheParameterGroupFamily": "redis2.8",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 2.8.6"
            },
            {
                "Engine": "redis",
                "EngineVersion": "3.2.10",
                "CacheParameterGroupFamily": "redis3.2",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 3.2.10"
            },
            {
                "Engine": "redis",
                "EngineVersion": "3.2.4",
                "CacheParameterGroupFamily": "redis3.2",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 3.2.4"
            },
            {
                "Engine": "redis",
                "EngineVersion": "3.2.6",
                "CacheParameterGroupFamily": "redis3.2",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 3.2.6"
            },
            {
                "Engine": "redis",
                "EngineVersion": "4.0.10",
                "CacheParameterGroupFamily": "redis4.0",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 4.0.10"
            },
            {
                "Engine": "redis",
                "EngineVersion": "5.0.0",
                "CacheParameterGroupFamily": "redis5.0",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 5.0.0"
            },
            {
                "Engine": "redis",
                "EngineVersion": "5.0.3",
                "CacheParameterGroupFamily": "redis5.0",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 5.0.3"
            },
            {
                "Engine": "redis",
                "EngineVersion": "5.0.4",
                "CacheParameterGroupFamily": "redis5.0",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 5.0.4"
            },
            {
                "Engine": "redis",
                "EngineVersion": "5.0.5",
                "CacheParameterGroupFamily": "redis5.0",
                "CacheEngineDescription": "Redis",
                "CacheEngineVersionDescription": "redis version 5.0.5"
            }
        ]
    }
