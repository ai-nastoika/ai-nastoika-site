ALTER TABLE `users` ADD `telegram_chat_id` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `telegram_link_code` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `telegram_link_expires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_email` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_telegram` int NOT NULL DEFAULT 1;
