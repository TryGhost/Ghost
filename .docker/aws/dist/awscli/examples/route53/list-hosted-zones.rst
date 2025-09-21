**To list the hosted zones associated with the current AWS account**

The following ``list-hosted-zones`` command lists summary information about the first 100 hosted zones that are associated with the current AWS account.::

  aws route53 list-hosted-zones

If you have more than 100 hosted zones, or if you want to list them in groups smaller than 100, include the ``--max-items`` parameter. For example, to list hosted zones one at a time, use the following command::

  aws route53 list-hosted-zones --max-items 1

To view information about the next hosted zone, take the value of ``NextToken`` from the response to the previous command, and include it in the ``--starting-token`` parameter, for example::

  aws route53 list-hosted-zones --max-items 1 --starting-token Z3M3LMPEXAMPLE

