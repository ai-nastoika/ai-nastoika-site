CREATE TABLE `transactions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`type` varchar(20) NOT NULL,
	`amount_kopecks` int NOT NULL,
	`balance_after` int NOT NULL,
	`external_id` varchar(128),
	`meta` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_external_id_idx` UNIQUE(`external_id`)
);
--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `cost_kopecks` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `was_free` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `free_requests_left` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `balance_kopecks` int DEFAULT 0 NOT NULL;