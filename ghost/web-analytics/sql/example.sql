select timestamp, site_uuid, session_id from analytics_events
WHERE timestamp > now() - INTERVAL 1 day
ORDER BY timestamp DESC