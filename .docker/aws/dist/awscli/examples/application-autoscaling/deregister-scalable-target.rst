**To deregister a scalable target**

This example deregisters a scalable target for an Amazon ECS service called `web-app` that is running in the `default` cluster.

Command::

  aws application-autoscaling deregister-scalable-target --service-namespace ecs --scalable-dimension ecs:service:DesiredCount --resource-id service/default/web-app

This example deregisters a scalable target for a custom resource. The custom-resource-id.txt file contains a string that identifies the Resource ID, which, for a custom resource, is the path to the custom resource through your Amazon API Gateway endpoint.  

Command::

  aws application-autoscaling deregister-scalable-target --service-namespace custom-resource --scalable-dimension custom-resource:ResourceType:Property --resource-id file://~/custom-resource-id.txt

Contents of custom-resource-id.txt file::

  https://example.execute-api.us-west-2.amazonaws.com/prod/scalableTargetDimensions/1-23456789
