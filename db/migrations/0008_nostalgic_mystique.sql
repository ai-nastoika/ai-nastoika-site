CREATE TABLE `donations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`name` varchar(100),
	`amount_kopecks` int NOT NULL,
	`message` text,
	`external_id` varchar(128) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `donations_id` PRIMARY KEY(`id`),
	CONSTRAINT `donations_external_id_idx` UNIQUE(`external_id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `is_donor` int DEFAULT 0 NOT NULL;