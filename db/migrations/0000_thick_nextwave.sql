CREATE TABLE `ai_usage` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`fingerprint` varchar(64),
	`request_type` varchar(20) NOT NULL,
	`tokens_used` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`recipe_id` bigint unsigned,
	`place_id` bigint unsigned,
	`author_name` varchar(100),
	`author_avatar` varchar(10),
	`text` text NOT NULL,
	`likes` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `label_templates` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`image` varchar(255),
	`bg` varchar(255),
	`border` varchar(255),
	`accent` varchar(20) NOT NULL DEFAULT '#8B4513',
	`font_family` varchar(20) NOT NULL DEFAULT 'serif',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `label_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `place_infusions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`place_id` bigint unsigned NOT NULL,
	`name` varchar(200) NOT NULL,
	`note` varchar(300),
	`is_signature` int DEFAULT 0,
	CONSTRAINT `place_infusions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `places` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(200) NOT NULL,
	`city` varchar(100),
	`address` varchar(300),
	`metro` varchar(100),
	`phone` varchar(50),
	`website` varchar(200),
	`rating` decimal(2,1) DEFAULT '0',
	`reviews` int DEFAULT 0,
	`price` varchar(20),
	`hours` varchar(100),
	`image` varchar(255),
	`tags` json,
	`description` text,
	`infusions_highlight` varchar(300),
	`infusions_signature` varchar(200),
	`external_source` varchar(200),
	`external_summary` text,
	`external_pros` json,
	`external_cons` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `places_id` PRIMARY KEY(`id`),
	CONSTRAINT `places_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`recipe_id` bigint unsigned NOT NULL,
	`name` varchar(200) NOT NULL,
	`amount` varchar(100),
	`note` varchar(200),
	`sort_order` int DEFAULT 0,
	CONSTRAINT `recipe_ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recipe_steps` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`recipe_id` bigint unsigned NOT NULL,
	`step_num` int NOT NULL,
	`title` varchar(200),
	`text` text NOT NULL,
	`sort_order` int DEFAULT 0,
	CONSTRAINT `recipe_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`title` varchar(200) NOT NULL,
	`subtitle` varchar(300),
	`category` varchar(50) NOT NULL,
	`category_label` varchar(100),
	`hero_image` varchar(255),
	`abv` varchar(10),
	`time` varchar(50),
	`difficulty` varchar(20),
	`rating` decimal(2,1) DEFAULT '0',
	`reviews` int DEFAULT 0,
	`year` varchar(50),
	`origin` varchar(100),
	`history_title` varchar(200),
	`history_text` text,
	`tasting_color` varchar(200),
	`tasting_description` text,
	`tasting_pairing` json,
	`tasting_temp` varchar(50),
	`tasting_glass` varchar(100),
	`sweet` int DEFAULT 0,
	`sour` int DEFAULT 0,
	`bitter` int DEFAULT 0,
	`spicy` int DEFAULT 0,
	`fruity` int DEFAULT 0,
	`herbal` int DEFAULT 0,
	`tips` json,
	`author_name` varchar(100),
	`author_date` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recipes_id` PRIMARY KEY(`id`),
	CONSTRAINT `recipes_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `user_recipe_submissions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`fingerprint` varchar(64),
	`author_name` varchar(100),
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`raw_title` varchar(200) NOT NULL,
	`raw_description` text,
	`raw_ingredients` text,
	`raw_steps` text,
	`raw_notes` text,
	`processed_data` text,
	`slug` varchar(100),
	`title` varchar(200),
	`subtitle` varchar(255),
	`category` varchar(30),
	`category_label` varchar(50),
	`abv` varchar(20),
	`time` varchar(50),
	`difficulty` varchar(20),
	`year` varchar(50),
	`origin` varchar(100),
	`history_title` varchar(200),
	`history_text` text,
	`tasting_color` varchar(100),
	`tasting_description` text,
	`tasting_temp` varchar(50),
	`tasting_glass` varchar(100),
	`sweet` int,
	`sour` int,
	`bitter` int,
	`spicy` int,
	`fruity` int,
	`herbal` int,
	`author_date` varchar(20),
	`admin_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_recipe_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(100),
	`avatar` varchar(255),
	`role` varchar(20) NOT NULL DEFAULT 'user',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
