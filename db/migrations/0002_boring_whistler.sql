CREATE TABLE `feedback` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`name` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`topic` varchar(50) NOT NULL,
	`message` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'new',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`phone` varchar(20) NOT NULL,
	`code` varchar(6) NOT NULL,
	`purpose` varchar(20) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verify_token` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `email_verify_expires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `phone_verified` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_enabled` int DEFAULT 0 NOT NULL;