CREATE TABLE `label_before_after` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`before_image_url` varchar(255) NOT NULL,
	`after_image_url` varchar(255) NOT NULL,
	`title` varchar(150),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `label_before_after_id` PRIMARY KEY(`id`)
);
