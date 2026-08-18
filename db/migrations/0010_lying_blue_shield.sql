ALTER TABLE `ai_usage` ADD `model_used` varchar(100);--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `used_fallback` int DEFAULT 0 NOT NULL;