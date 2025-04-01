select count(distinct session_id) as sessions, count(*) as pageviews from _mv_hits__v${TB_VERSION:-0}
where browser = 'chrome'
