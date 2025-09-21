**To enable thing indexing**

The following ``update-indexing-configuration`` example enables thing indexing to support searching registry data, shadow data, and thing connectivity status using the AWS_Things index. ::

    aws iot update-indexing-configuration 
        --thing-indexing-configuration thingIndexingMode=REGISTRY_AND_SHADOW,thingConnectivityIndexingMode=STATUS

This command produces no output.

For more information, see `Managing Thing Indexing <https://docs.aws.amazon.com/iot/latest/developerguide/managing-index.html>`__ in the *AWS IoT Developers Guide*.

