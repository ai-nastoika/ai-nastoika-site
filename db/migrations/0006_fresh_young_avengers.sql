CREATE TABLE `recipe_tracker_stages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`recipe_id` bigint unsigned NOT NULL,
	`stage_type` varchar(20) NOT NULL,
	`title` varchar(300) NOT NULL,
	`day_offset` int NOT NULL DEFAULT 0,
	`repeat_every_days` int,
	`sort_order` int DEFAULT 0,
	CONSTRAINT `recipe_tracker_stages_id` PRIMARY KEY(`id`)
);
ALTER TABLE `recipe_steps` DROP COLUMN `stage_type`;
ALTER TABLE `recipe_steps` DROP COLUMN `wait_days`;
ALTER TABLE `recipe_steps` DROP COLUMN `repeat_every_days`;
