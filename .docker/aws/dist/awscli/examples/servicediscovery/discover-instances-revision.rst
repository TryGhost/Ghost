**To discover the revision of an instance**

The following ``discover-instances-revision`` example discovers the increasing revision of an instance. ::

    aws servicediscovery discover-instances-revision \
        --namespace-name example.com \
        --service-name myservice

Output::

    {
        "InstancesRevision": 123456
    }

For more information, see `AWS Cloud Map service instances <https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-instances.html>`__ in the *AWS Cloud Map Developer Guide*.
