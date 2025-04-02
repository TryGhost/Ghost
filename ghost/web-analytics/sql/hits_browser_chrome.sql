select timestamp, session_id, browser, os, device, location, pathname from _mv_hits__v${TB_VERSION:-0}
where browser = 'chrome'
order by session_id, timestamp
