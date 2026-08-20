CREATE TABLE `generated_labels` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`title` varchar(100) NOT NULL,
	`image_base64` mediumtext NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generated_labels_id` PRIMARY KEY(`id`)
);
