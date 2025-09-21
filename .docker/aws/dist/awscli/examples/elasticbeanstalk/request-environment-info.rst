**To request tailed logs**

The following command requests logs from an environment named ``my-env``::

  aws elasticbeanstalk request-environment-info --environment-name my-env --info-type tail

After requesting logs, retrieve their location with `retrieve-environment-info`_.

.. _`retrieve-environment-info`: http://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/retrieve-environment-info.html
