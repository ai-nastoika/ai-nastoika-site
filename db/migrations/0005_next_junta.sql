ALTER TABLE `recipe_steps` ADD `stage_type` varchar(20);--> statement-breakpoint
ALTER TABLE `recipe_steps` ADD `wait_days` int;--> statement-breakpoint
ALTER TABLE `recipe_steps` ADD `repeat_every_days` int;
