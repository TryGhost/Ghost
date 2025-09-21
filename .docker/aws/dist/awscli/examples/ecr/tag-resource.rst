**To tag a repository**

The following ``tag-resource`` example sets a tag with key ``Stage`` and value ``Integ`` on the ``hello-world`` repository. ::

    aws ecr tag-resource \
        --resource-arn arn:aws:ecr:us-west-2:012345678910:repository/hello-world \
        --tags Key=Stage,Value=Integ

This command produces no output.
