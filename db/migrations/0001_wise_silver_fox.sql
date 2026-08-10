CREATE TABLE `recipe_ratings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`recipe_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`rating` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recipe_ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `comments` ADD `user_id` bigint unsigned;