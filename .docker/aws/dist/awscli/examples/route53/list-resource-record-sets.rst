**To list the resource record sets in a hosted zone**

The following ``list-resource-record-sets`` command lists summary information about the first 100 resource record sets in a specified hosted zone.::

  aws route53 list-resource-record-sets --hosted-zone-id Z2LD58HEXAMPLE

If the hosted zone contains more than 100 resource record sets, or if you want to list them in groups smaller than 100, include the ``--maxitems`` parameter. For example, to list resource record sets one at a time, use the following command::

  aws route53 list-resource-record-sets --hosted-zone-id Z2LD58HEXAMPLE --max-items 1

To view information about the next resource record set in the hosted zone, take the value of ``NextToken`` from the response to the previous command, and include it in the ``--starting-token`` parameter, for example::

  aws route53 list-resource-record-sets --hosted-zone-id Z2LD58HEXAMPLE --max-items 1 --starting-token Z3M3LMPEXAMPLE

To view all the resource record sets of a particular name, use the ``--query`` parameter to filter them out. For example::

  aws route53 list-resource-record-sets --hosted-zone-id Z2LD58HEXAMPLE --query "ResourceRecordSets[?Name == 'example.domain.']"

