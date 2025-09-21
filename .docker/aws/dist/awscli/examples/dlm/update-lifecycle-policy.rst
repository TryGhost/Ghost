**Example 1: To enable a lifecycle policy**

The following ``update-lifecycle-policy`` example enables the specified lifecycle policy. ::

    aws dlm update-lifecycle-policy \
        --policy-id policy-0123456789abcdef0 \
        --state ENABLED

**Example 2: To disable a lifecycle policy**

The following ``update-lifecycle-policy`` example disables the specified lifecycle policy. ::

    aws dlm update-lifecycle-policy \
        --policy-id policy-0123456789abcdef0 \
        --state DISABLED

**Example 3: To update the details for lifecycle policy**

The following ``update-lifecycle-policy`` example updates the target tags for the specified lifecycle policy. ::

    aws dlm update-lifecycle-policy \
        --policy-id policy-0123456789abcdef0
        --policy-details file://policyDetails.json
  
Contents of ``policyDetails.json``. Other details not referenced in this file are not changed by the command. ::

    {
        "TargetTags": [
            {
                "Key": "costCenter",
                "Value": "120"
            },
            {
                "Key": "project",
                "Value": "lima"
            }
        ]  
    }
