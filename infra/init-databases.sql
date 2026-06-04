-- Creates one database per service. Run automatically by the postgres container
-- via /docker-entrypoint-initdb.d on first boot.
CREATE DATABASE auth_db;
CREATE DATABASE user_db;
CREATE DATABASE connection_db;
CREATE DATABASE post_db;
CREATE DATABASE messaging_db;
CREATE DATABASE notification_db;
CREATE DATABASE media_db;
CREATE DATABASE job_db;
