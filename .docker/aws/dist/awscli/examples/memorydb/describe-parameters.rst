**To return a list of parameters**

The following `describe-parameters`` returns a list of parameters. ::

    aws memorydb describe-parameters

Output::

    {
        "Parameters": [
            {
                "Name": "acllog-max-len",
                "Value": "128",
                "Description": "The maximum length of the ACL Log",
                "DataType": "integer",
                "AllowedValues": "1-10000",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "activedefrag",
                "Value": "no",
                "Description": "Enabled active memory defragmentation",
                "DataType": "string",
                "AllowedValues": "yes,no",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "active-defrag-cycle-max",
                "Value": "75",
                "Description": "Maximal effort for defrag in CPU percentage",
                "DataType": "integer",
                "AllowedValues": "1-75",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "active-defrag-cycle-min",
                "Value": "5",
                "Description": "Minimal effort for defrag in CPU percentage",
                "DataType": "integer",
                "AllowedValues": "1-75",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "active-defrag-ignore-bytes",
                "Value": "104857600",
                "Description": "Minimum amount of fragmentation waste to start active defrag",
                "DataType": "integer",
                "AllowedValues": "1048576-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "active-defrag-max-scan-fields",
                "Value": "1000",
                "Description": "Maximum number of set/hash/zset/list fields that will be processed from the main dictionary scan",
                "DataType": "integer",
                "AllowedValues": "1-1000000",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "active-defrag-threshold-lower",
                "Value": "10",
                "Description": "Minimum percentage of fragmentation to start active defrag",
                "DataType": "integer",
                "AllowedValues": "1-100",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "active-defrag-threshold-upper",
                "Value": "100",
                "Description": "Maximum percentage of fragmentation at which we use maximum effort",
                "DataType": "integer",
                "AllowedValues": "1-100",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "active-expire-effort",
                "Value": "1",
                "Description": "The amount of effort that redis uses to expire items in the active expiration job",
                "DataType": "integer",
                "AllowedValues": "1-10",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "activerehashing",
                "Value": "yes",
                "Description": "Apply rehashing or not",
                "DataType": "string",
                "AllowedValues": "yes,no",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "client-output-buffer-limit-normal-hard-limit",
                "Value": "0",
                "Description": "Normal client output buffer hard limit in bytes",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "client-output-buffer-limit-normal-soft-limit",
                "Value": "0",
                "Description": "Normal client output buffer soft limit in bytes",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "client-output-buffer-limit-normal-soft-seconds",
                "Value": "0",
                "Description": "Normal client output buffer soft limit in seconds",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "client-output-buffer-limit-pubsub-hard-limit",
                "Value": "33554432",
                "Description": "Pubsub client output buffer hard limit in bytes",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "client-output-buffer-limit-pubsub-soft-limit",
                "Value": "8388608",
                "Description": "Pubsub client output buffer soft limit in bytes",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "client-output-buffer-limit-pubsub-soft-seconds",
                "Value": "60",
                "Description": "Pubsub client output buffer soft limit in seconds",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "hash-max-ziplist-entries",
                "Value": "512",
                "Description": "The maximum number of hash entries in order for the dataset to be compressed",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "hash-max-ziplist-value",
                "Value": "64",
                "Description": "The threshold of biggest hash entries in order for the dataset to be compressed",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "hll-sparse-max-bytes",
                "Value": "3000",
                "Description": "HyperLogLog sparse representation bytes limit",
                "DataType": "integer",
                "AllowedValues": "1-16000",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "lazyfree-lazy-eviction",
                "Value": "no",
                "Description": "Perform an asynchronous delete on evictions",
                "DataType": "string",
                "AllowedValues": "yes,no",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "lazyfree-lazy-expire",
                "Value": "no",
                "Description": "Perform an asynchronous delete on expired keys",
                "DataType": "string",
                "AllowedValues": "yes,no",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "lazyfree-lazy-server-del",
                "Value": "no",
                "Description": "Perform an asynchronous delete on key updates",
                "DataType": "string",
                "AllowedValues": "yes,no",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "lazyfree-lazy-user-del",
                "Value": "no",
                "Description": "Specifies whether the default behavior of DEL command acts the same as UNLINK",
                "DataType": "string",
                "AllowedValues": "yes,no",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "lfu-decay-time",
                "Value": "1",
                "Description": "The amount of time in minutes to decrement the key counter for LFU eviction policyd",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "lfu-log-factor",
                "Value": "10",
                "Description": "The log factor for incrementing key counter for LFU eviction policy",
                "DataType": "integer",
                "AllowedValues": "1-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "list-compress-depth",
                "Value": "0",
                "Description": "Number of quicklist ziplist nodes from each side of the list to exclude from compression. The head and tail of the list are always uncompressed for fast push/pop operations",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "maxmemory-policy",
                "Value": "noeviction",
                "Description": "Max memory policy",
                "DataType": "string",
                "AllowedValues": "volatile-lru,allkeys-lru,volatile-lfu,allkeys-lfu,volatile-random,allkeys-random,volatile-ttl,noeviction",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "maxmemory-samples",
                "Value": "3",
                "Description": "Max memory samples",
                "DataType": "integer",
                "AllowedValues": "1-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "notify-keyspace-events",
                "Description": "The keyspace events for Redis to notify Pub/Sub clients about. By default all notifications are disabled",
                "DataType": "string",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "set-max-intset-entries",
                "Value": "512",
                "Description": "The limit in the size of the set in order for the dataset to be compressed",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "slowlog-log-slower-than",
                "Value": "10000",
                "Description": "The execution time, in microseconds, to exceed in order for the command to get logged. Note that a negative number disables the slow log, while a value of zero forces the logging of every command",
                "DataType": "integer",
                "AllowedValues": "-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "slowlog-max-len",
                "Value": "128",
                "Description": "The length of the slow log. There is no limit to this length. Just be aware that it will consume memory. You can reclaim memory used by the slow log with SLOWLOG RESET.",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "stream-node-max-bytes",
                "Value": "4096",
                "Description": "The maximum size of a single node in a stream in bytes",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "stream-node-max-entries",
                "Value": "100",
                "Description": "The maximum number of items a single node in a stream can contain",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "tcp-keepalive",
                "Value": "300",
                "Description": "If non-zero, send ACKs every given number of seconds",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "timeout",
                "Value": "0",
                "Description": "Close connection if client is idle for a given number of seconds, or never if 0",
                "DataType": "integer",
                "AllowedValues": "0,20-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "tracking-table-max-keys",
                "Value": "1000000",
                "Description": "The maximum number of keys allowed for the tracking table for client side caching",
                "DataType": "integer",
                "AllowedValues": "1-100000000",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "zset-max-ziplist-entries",
                "Value": "128",
                "Description": "The maximum number of sorted set entries in order for the dataset to be compressed",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            },
            {
                "Name": "zset-max-ziplist-value",
                "Value": "64",
                "Description": "The threshold of biggest sorted set entries in order for the dataset to be compressed",
                "DataType": "integer",
                "AllowedValues": "0-",
                "MinimumEngineVersion": "6.2.4"
            }
        ]
    }

For more information, see `Configuring engine parameters using parameter groups <https://docs.aws.amazon.com/memorydb/latest/devguide/parametergroups.html>`__ in the *MemoryDB User Guide*.
