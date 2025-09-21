**To list the delegates for a resource**

The following ``list-resource-delegates`` command retrieves the delegates associated with the specified resource. ::

    aws workmail list-resource-delegates \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27 \
        --resource-id r-68bf2d3b1c0244aab7264c24b9217443

Output::

    {
        "Delegates": [
            {
                "Id": "S-1-1-11-1111111111-2222222222-3333333333-3333",
                "Type": "USER"
            }
        ]
    }
