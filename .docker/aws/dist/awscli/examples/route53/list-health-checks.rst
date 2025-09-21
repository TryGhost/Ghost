**To list the health checks associated with the current AWS account**

The following ``list-health-checks`` command lists detailed information about the first 100 health checks that are associated with the current AWS account.::

  aws route53 list-health-checks

If you have more than 100 health checks, or if you want to list them in groups smaller than 100, include the ``--maxitems`` parameter. For example, to list health checks one at a time, use the following command::

  aws route53 list-health-checks --max-items 1

To view the next health check, take the value of ``NextToken`` from the response to the previous command, and include it in the ``--starting-token`` parameter, for example::

  aws route53 list-health-checks --max-items 1 --starting-token Z3M3LMPEXAMPLE


