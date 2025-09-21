**Example 1: To register a single target with a maintenance window**

The following ``register-target-with-maintenance-window`` example registers an instance with a maintenance window. ::

    aws ssm register-target-with-maintenance-window \
        --window-id "mw-ab12cd34ef56gh78" \
        --target "Key=InstanceIds,Values=i-0000293ffd8c57862" \
        --owner-information "Single instance" \
        --resource-type "INSTANCE"

Output::

    {
        "WindowTargetId":"1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d-1a2"
    }

**Example 2: To register multiple targets with a maintenance window using instance IDs**
    
The following ``register-target-with-maintenance-window`` example registers two instances with a maintenance window by specifying their instance IDs. ::

    aws ssm register-target-with-maintenance-window \
        --window-id "mw-ab12cd34ef56gh78" \
        --target "Key=InstanceIds,Values=i-0000293ffd8c57862,i-0cb2b964d3e14fd9f" \
        --owner-information "Two instances in a list" \
        --resource-type "INSTANCE"

Output::

    {
        "WindowTargetId":"1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d-1a2"
    }
  
**Example 3: To register targets with a maintenance window using resource tags**

The following ``register-target-with-maintenance-window`` example registers instances with a maintenance window by specifying resource tags that have been applied to the instances. ::

    aws ssm register-target-with-maintenance-window \
        --window-id "mw-06cf17cbefcb4bf4f" \
        --targets "Key=tag:Environment,Values=Prod" "Key=Role,Values=Web" \
        --owner-information "Production Web Servers" \
        --resource-type "INSTANCE"

Output::

    {
        "WindowTargetId":"1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d-1a2"
    }

**Example 4: To register targets using a group of tag keys**

The following ``register-target-with-maintenance-window`` example register instances that all have one or more tag keys assigned to them, regardless of their key values. ::

    aws ssm register-target-with-maintenance-window \
        --window-id "mw-0c50858d01EXAMPLE" \
        --resource-type "INSTANCE" \
        --target "Key=tag-key,Values=Name,Instance-Type,CostCenter"

Output::

    {
        "WindowTargetId":"1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d-1a2"
    }

**Example 5: To register targets using a resource group name**

The following ``register-target-with-maintenance-window`` example register a specified resource group, regardless of the type of resources it contains. ::

    aws ssm register-target-with-maintenance-window \
        --window-id "mw-0c50858d01EXAMPLE" \
        --resource-type "RESOURCE_GROUP" \    
        --target "Key=resource-groups:Name,Values=MyResourceGroup"

Output::

    {
        "WindowTargetId":"1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d-1a2"
    }

For more information, see `Register a Target Instance with the Maintenance Window (AWS CLI)  <https://docs.aws.amazon.com/systems-manager/latest/userguide/mw-cli-tutorial-targets.html>`__ in the *AWS Systems Manager User Guide*.
