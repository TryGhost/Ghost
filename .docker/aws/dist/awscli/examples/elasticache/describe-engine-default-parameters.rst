**To describe engine default parameters**

The following ``describe-engine-default-parameters`` example returns the default engine and system parameter information for the specified cache engine. :: 

    aws elasticache describe-engine-default-parameters \
        --cache-parameter-group-family "redis5.0"

Output::

    {
        "EngineDefaults": {
            "Parameters": [
                {
                    "ParameterName": "activedefrag",
                    "ParameterValue": "no",
                    "Description": "Enabled active memory defragmentation",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "active-defrag-cycle-max",
                    "ParameterValue": "75",
                    "Description": "Maximal effort for defrag in CPU percentage",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1-75",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "active-defrag-cycle-min",
                    "ParameterValue": "5",
                    "Description": "Minimal effort for defrag in CPU percentage",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1-75",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "active-defrag-ignore-bytes",
                    "ParameterValue": "104857600",
                    "Description": "Minimum amount of fragmentation waste to start active defrag",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1048576-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "active-defrag-max-scan-fields",
                    "ParameterValue": "1000",
                    "Description": "Maximum number of set/hash/zset/list fields that will be processed from the main dictionary scan",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1-1000000",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "active-defrag-threshold-lower",
                    "ParameterValue": "10",
                    "Description": "Minimum percentage of fragmentation to start active defrag",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1-100",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "active-defrag-threshold-upper",
                    "ParameterValue": "100",
                    "Description": "Maximum percentage of fragmentation at which we use maximum effort",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1-100",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "activerehashing",
                    "ParameterValue": "yes",
                    "Description": "Apply rehashing or not.",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "requires-reboot"
                },
                {
                    "ParameterName": "appendfsync",
                    "ParameterValue": "everysec",
                    "Description": "fsync policy for AOF persistence",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "always,everysec,no",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "appendonly",
                    "ParameterValue": "no",
                    "Description": "Enable Redis persistence.",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "client-output-buffer-limit-normal-hard-limit",
                    "ParameterValue": "0",
                    "Description": "Normal client output buffer hard limit in bytes.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "client-output-buffer-limit-normal-soft-limit",
                    "ParameterValue": "0",
                    "Description": "Normal client output buffer soft limit in bytes.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "client-output-buffer-limit-normal-soft-seconds",
                    "ParameterValue": "0",
                    "Description": "Normal client output buffer soft limit in seconds.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "client-output-buffer-limit-pubsub-hard-limit",
                    "ParameterValue": "33554432",
                    "Description": "Pubsub client output buffer hard limit in bytes.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "client-output-buffer-limit-pubsub-soft-limit",
                    "ParameterValue": "8388608",
                    "Description": "Pubsub client output buffer soft limit in bytes.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "client-output-buffer-limit-pubsub-soft-seconds",
                    "ParameterValue": "60",
                    "Description": "Pubsub client output buffer soft limit in seconds.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "client-output-buffer-limit-replica-soft-seconds",
                    "ParameterValue": "60",
                    "Description": "Replica client output buffer soft limit in seconds.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "client-query-buffer-limit",
                    "ParameterValue": "1073741824",
                    "Description": "Max size of a single client query buffer",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1048576-1073741824",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "close-on-replica-write",
                    "ParameterValue": "yes",
                    "Description": "If enabled, clients who attempt to write to a read-only replica will be disconnected. Applicable to 2.8.23 and higher.",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "cluster-enabled",
                    "ParameterValue": "no",
                    "Description": "Enable cluster mode",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "requires-reboot"
                },
                {
                    "ParameterName": "cluster-require-full-coverage",
                    "ParameterValue": "no",
                    "Description": "Whether cluster becomes unavailable if one or more slots are not covered",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "databases",
                    "ParameterValue": "16",
                    "Description": "Set the number of databases.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1-1200000",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "requires-reboot"
                },
                {
                    "ParameterName": "hash-max-ziplist-entries",
                    "ParameterValue": "512",
                    "Description": "The maximum number of hash entries in order for the dataset to be compressed.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "hash-max-ziplist-value",
                    "ParameterValue": "64",
                    "Description": "The threshold of biggest hash entries in order for the dataset to be compressed.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "hll-sparse-max-bytes",
                    "ParameterValue": "3000",
                    "Description": "HyperLogLog sparse representation bytes limit",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1-16000",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "lazyfree-lazy-eviction",
                    "ParameterValue": "no",
                    "Description": "Perform an asynchronous delete on evictions",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "lazyfree-lazy-expire",
                    "ParameterValue": "no",
                    "Description": "Perform an asynchronous delete on expired keys",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "lazyfree-lazy-server-del",
                    "ParameterValue": "no",
                    "Description": "Perform an asynchronous delete on key updates",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "lfu-decay-time",
                    "ParameterValue": "1",
                    "Description": "The amount of time in minutes to decrement the key counter for LFU eviction policy",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "lfu-log-factor",
                    "ParameterValue": "10",
                    "Description": "The log factor for incrementing key counter for LFU eviction policy",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "list-compress-depth",
                    "ParameterValue": "0",
                    "Description": "Number of quicklist ziplist nodes from each side of the list to exclude from compression. The head and tail of the list are always uncompressed for fast push/pop operations",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "list-max-ziplist-size",
                    "ParameterValue": "-2",
                    "Description": "The number of entries allowed per internal list node can be specified as a fixed maximum size or a maximum number of elements",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "-5,-4,-3,-2,-1,1-",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "lua-replicate-commands",
                    "ParameterValue": "yes",
                    "Description": "Always enable Lua effect replication or not",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "lua-time-limit",
                    "ParameterValue": "5000",
                    "Description": "Max execution time of a Lua script in milliseconds. 0 for unlimited execution without warnings.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "5000",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "maxclients",
                    "ParameterValue": "65000",
                    "Description": "The maximum number of Redis clients.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1-65000",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "requires-reboot"
                },
                {
                    "ParameterName": "maxmemory-policy",
                    "ParameterValue": "volatile-lru",
                    "Description": "Max memory policy.",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "volatile-lru,allkeys-lru,volatile-lfu,allkeys-lfu,volatile-random,allkeys-random,volatile-ttl,noeviction",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "maxmemory-samples",
                    "ParameterValue": "3",
                    "Description": "Max memory samples.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "min-replicas-max-lag",
                    "ParameterValue": "10",
                    "Description": "The maximum amount of replica lag in seconds beyond which the master would stop taking writes. A value of 0 means the master always takes writes.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "min-replicas-to-write",
                    "ParameterValue": "0",
                    "Description": "The minimum number of replicas that must be present with lag no greater than min-replicas-max-lag for master to take writes. Setting this to 0 means the master always takes writes.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "notify-keyspace-events",
                    "Description": "The keyspace events for Redis to notify Pub/Sub clients about. By default all notifications are disabled",
                    "Source": "system",
                    "DataType": "string",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "proto-max-bulk-len",
                    "ParameterValue": "536870912",
                    "Description": "Max size of a single element request",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "1048576-536870912",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "rename-commands",
                    "ParameterValue": "",
                    "Description": "Redis commands that can be dynamically renamed by the customer",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "APPEND,BITCOUNT,BITFIELD,BITOP,BITPOS,BLPOP,BRPOP,BRPOPLPUSH,BZPOPMIN,BZPOPMAX,CLIENT,COMMAND,DBSIZE,DECR,DECRBY,DEL,DISCARD,DUMP,ECHO,EVAL,EVALSHA,EXEC,EXISTS,EXPIRE,EXPIREAT,FLUSHALL,FLUSHDB,GEOADD,GEOHASH,GEOPOS,GEODIST,GEORADIUS,GEORADIUSBYMEMBER,GET,GETBIT,GETRANGE,GETSET,HDEL,HEXISTS,HGET,HGETALL,HINCRBY,HINCRBYFLOAT,HKEYS,HLEN,HMGET,HMSET,HSET,HSETNX,HSTRLEN,HVALS,INCR,INCRBY,INCRBYFLOAT,INFO,KEYS,LASTSAVE,LINDEX,LINSERT,LLEN,LPOP,LPUSH,LPUSHX,LRANGE,LREM,LSET,LTRIM,MEMORY,MGET,MONITOR,MOVE,MSET,MSETNX,MULTI,OBJECT,PERSIST,PEXPIRE,PEXPIREAT,PFADD,PFCOUNT,PFMERGE,PING,PSETEX,PSUBSCRIBE,PUBSUB,PTTL,PUBLISH,PUNSUBSCRIBE,RANDOMKEY,READONLY,READWRITE,RENAME,RENAMENX,RESTORE,ROLE,RPOP,RPOPLPUSH,RPUSH,RPUSHX,SADD,SCARD,SCRIPT,SDIFF,SDIFFSTORE,SELECT,SET,SETBIT,SETEX,SETNX,SETRANGE,SINTER,SINTERSTORE,SISMEMBER,SLOWLOG,SMEMBERS,SMOVE,SORT,SPOP,SRANDMEMBER,SREM,STRLEN,SUBSCRIBE,SUNION,SUNIONSTORE,SWAPDB,TIME,TOUCH,TTL,TYPE,UNSUBSCRIBE,UNLINK,UNWATCH,WAIT,WATCH,ZADD,ZCARD,ZCOUNT,ZINCRBY,ZINTERSTORE,ZLEXCOUNT,ZPOPMAX,ZPOPMIN,ZRANGE,ZRANGEBYLEX,ZREVRANGEBYLEX,ZRANGEBYSCORE,ZRANK,ZREM,ZREMRANGEBYLEX,ZREMRANGEBYRANK,ZREMRANGEBYSCORE,ZREVRANGE,ZREVRANGEBYSCORE,ZREVRANK,ZSCORE,ZUNIONSTORE,SCAN,SSCAN,HSCAN,ZSCAN,XINFO,XADD,XTRIM,XDEL,XRANGE,XREVRANGE,XLEN,XREAD,XGROUP,XREADGROUP,XACK,XCLAIM,XPENDING,GEORADIUS_RO,GEORADIUSBYMEMBER_RO,LOLWUT,XSETID,SUBSTR",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.3",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "repl-backlog-size",
                    "ParameterValue": "1048576",
                    "Description": "The replication backlog size in bytes for PSYNC. This is the size of the buffer which accumulates slave data when slave is disconnected for some time, so that when slave reconnects again, only transfer the portion of data which the slave missed. Minimum value is 16K.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "16384-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "repl-backlog-ttl",
                    "ParameterValue": "3600",
                    "Description": "The amount of time in seconds after the master no longer have any slaves connected for the master to free the replication backlog. A value of 0 means to never release the backlog.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "replica-allow-chaining",
                    "ParameterValue": "no",
                    "Description": "Configures if chaining of replicas is allowed",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "replica-ignore-maxmemory",
                    "ParameterValue": "yes",
                    "Description": "Determines if replica ignores maxmemory setting by not evicting items independent from the master",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "replica-lazy-flush",
                    "ParameterValue": "no",
                    "Description": "Perform an asynchronous flushDB during replica sync",
                    "Source": "system",
                    "DataType": "string",
                    "AllowedValues": "yes,no",
                    "IsModifiable": false,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "reserved-memory-percent",
                    "ParameterValue": "25",
                    "Description": "The percent of memory reserved for non-cache memory usage. You may want to increase this parameter for nodes with read replicas, AOF enabled, etc, to reduce swap usage.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-100",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "set-max-intset-entries",
                    "ParameterValue": "512",
                    "Description": "The limit in the size of the set in order for the dataset to be compressed.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "slowlog-log-slower-than",
                    "ParameterValue": "10000",
                    "Description": "The execution time, in microseconds, to exceed in order for the command to get logged. Note that a negative number disables the slow log, while a value of zero forces the logging of every command.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "slowlog-max-len",
                    "ParameterValue": "128",
                    "Description": "The length of the slow log. There is no limit to this length. Just be aware that it will consume memory. You can reclaim memory used by the slow log with SLOWLOG RESET.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "stream-node-max-bytes",
                    "ParameterValue": "4096",
                    "Description": "The maximum size of a single node in a stream in bytes",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "stream-node-max-entries",
                    "ParameterValue": "100",
                    "Description": "The maximum number of items a single node in a stream can contain",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "tcp-keepalive",
                    "ParameterValue": "300",
                    "Description": "If non-zero, send ACKs every given number of seconds.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "timeout",
                    "ParameterValue": "0",
                    "Description": "Close connection if client is idle for a given number of seconds, or never if 0.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0,20-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "zset-max-ziplist-entries",
                    "ParameterValue": "128",
                    "Description": "The maximum number of sorted set entries in order for the dataset to be compressed.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                },
                {
                    "ParameterName": "zset-max-ziplist-value",
                    "ParameterValue": "64",
                    "Description": "The threshold of biggest sorted set entries in order for the dataset to be compressed.",
                    "Source": "system",
                    "DataType": "integer",
                    "AllowedValues": "0-",
                    "IsModifiable": true,
                    "MinimumEngineVersion": "5.0.0",
                    "ChangeType": "immediate"
                }
            ]
        }
    }
