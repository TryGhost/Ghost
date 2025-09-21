The following command adds a tag named ``owner`` to a healthcheck resource specified by ID::

  aws route53 change-tags-for-resource --resource-type healthcheck --resource-id 6233434j-18c1-34433-ba8e-3443434 --add-tags Key=owner,Value=myboss

The following command removes a tag named ``owner`` from a hosted zone resource specified by ID::

  aws route53 change-tags-for-resource --resource-type hostedzone --resource-id Z1523434445 --remove-tag-keys owner 
