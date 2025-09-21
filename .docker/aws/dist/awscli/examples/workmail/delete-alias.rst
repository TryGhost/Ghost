**To delete an alias**

The following ``delete-alias`` command deletes the alias for the specified entity (user or group). ::

    aws workmail delete-alias \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27 \
        --entity-id S-1-1-11-1122222222-2222233333-3333334444-4444 \
        --alias exampleAlias@site.awsapps.com

This command produces no output.
