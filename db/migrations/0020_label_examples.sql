CREATE TABLE `label_examples` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`image_url` varchar(255) NOT NULL,
	`prompt` text NOT NULL,
	`title` varchar(150),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `label_examples_id` PRIMARY KEY(`id`)
);
