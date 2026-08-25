ALTER TABLE `infusion_stages` ADD `notify_enabled` int NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `infusion_stages` ADD `reminder_sent_at` timestamp;
