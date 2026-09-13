CREATE TABLE `site_visits` (
	`day` varchar(10) NOT NULL,
	`pageviews` int NOT NULL DEFAULT 0,
	`visits` int NOT NULL DEFAULT 0,
	CONSTRAINT `site_visits_day` PRIMARY KEY(`day`)
);
--> statement-breakpoint
CREATE TABLE `visit_dedup` (
	`hash` varchar(64) NOT NULL,
	`day` varchar(10) NOT NULL,
	CONSTRAINT `visit_dedup_hash` PRIMARY KEY(`hash`)
);
