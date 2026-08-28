CREATE TABLE `comment_likes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`comment_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comment_likes_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_comment_like` UNIQUE(`user_id`,`comment_id`)
);
