**To scan an entire table**

This example scans the entire *MusicCollection* table, and then narrows the
results to songs by the artist "No One You Know". For each item, only the album
title and song title are returned.

Command::

    aws ddb select MusicCollection --projection 'SongTitle, AlbumTitle' \
        --filter 'Artist = "No One You Know"'

Output::

    Count: 2
    Items:
    - SongTitle: "Call Me Today"
      AlbumTitle: "Somewhat Famous"
    - SongTitle: "Scared of My Shadow"
      AlbumTitle: "Blue Sky Blues"
    ScannedCount: 3

**To query for specific primary keys**

This example queries items in the *MusicCollection* table. The table has a
hash-and-range primary key (*Artist* and *SongTitle*), but this query only
specifies the hash key value. It returns song titles by the artist named "No
One You Know".

Command::

    aws ddb select MusicCollection --projection SongTitle \
        --key-condition 'Artist = "No One You Know"'

Output::

    Count: 2
    Items:
    - SongTitle: "Call Me Today"
    - SongTitle: "Scared of My Shadow"
    ScannedCount: 2
