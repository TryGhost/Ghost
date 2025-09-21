**To update the name for a subscription definition**

The following ``update-subscription-definition`` example updates the name for the specified subscription definition. If you want to change details for the subscription, use the ``create-subscription-definition-version`` command to create a new version. ::

    aws greengrass update-subscription-definition \
        --subscription-definition-id "fa81bc84-3f59-4377-a84b-5d0134da359b" \
        --name "ObsoleteSubscription"

This command produces no output.

For more information, see `title <link>`__ in the *guide*.
