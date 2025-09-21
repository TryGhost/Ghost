**To retrieve a list of organizations**

The following ``list-organizations`` command retrieves summaries of the customer's organizations. ::

    aws workmail list-organizations

Output::

    {
        "OrganizationSummaries": [
            {
                "OrganizationId": "m-d281d0a2fd824be5b6cd3d3ce909fd27",
                "Alias": "exampleAlias",
                "State": "Active"
            }
        ]
    }
