**Example 1: To list your pipeline runs**

The following ``list-runs`` example lists the runs for the specified pipeline. ::

    aws datapipeline list-runs --pipeline-id df-00627471SOVYZEXAMPLE

Output::

        Name                       Scheduled Start        Status                     ID                                              Started                Ended
        -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    1.  EC2ResourceObj             2015-04-12T17:33:02    CREATING                   @EC2ResourceObj_2015-04-12T17:33:02             2015-04-12T17:33:10
    2.  S3InputLocation            2015-04-12T17:33:02    FINISHED                   @S3InputLocation_2015-04-12T17:33:02            2015-04-12T17:33:09    2015-04-12T17:33:09
    3.  S3OutputLocation           2015-04-12T17:33:02    WAITING_ON_DEPENDENCIES    @S3OutputLocation_2015-04-12T17:33:02           2015-04-12T17:33:09
    4.  ShellCommandActivityObj    2015-04-12T17:33:02    WAITING_FOR_RUNNER         @ShellCommandActivityObj_2015-04-12T17:33:02    2015-04-12T17:33:09

**Example 2: To list the pipeline runs between the specified dates**

The following ``list-runs`` example uses the ``--start-interval`` to specify the dates to include in the output. ::

    aws datapipeline list-runs --pipeline-id df-01434553B58A2SHZUKO5 --start-interval 2017-10-07T00:00:00,2017-10-08T00:00:00
