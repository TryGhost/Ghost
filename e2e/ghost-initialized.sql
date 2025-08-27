-- MySQL dump 10.13  Distrib 9.2.0, for macos15.2 (arm64)
--
-- Host: 127.0.0.1    Database: ghost_testing
-- ------------------------------------------------------
-- Server version	8.4.5

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `actions`
--

DROP TABLE IF EXISTS `actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actions` (
  `id` varchar(24) NOT NULL,
  `resource_id` varchar(24) DEFAULT NULL,
  `resource_type` varchar(50) NOT NULL,
  `actor_id` varchar(24) NOT NULL,
  `actor_type` varchar(50) NOT NULL,
  `event` varchar(50) NOT NULL,
  `context` text,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `actions`
--

LOCK TABLES `actions` WRITE;
/*!40000 ALTER TABLE `actions` DISABLE KEYS */;
INSERT INTO `actions` VALUES ('68ae38c439f9d451fc955375','68ae38c239f9d451fc955306','setting','5951f5fc0000000000000000','user','edited','{\"key\":\"description\",\"group\":\"site\"}','2025-08-26 22:44:20'),('68ae38c439f9d451fc955376','68ae38c239f9d451fc955305','setting','5951f5fc0000000000000000','user','edited','{\"key\":\"title\",\"group\":\"site\"}','2025-08-26 22:44:20');
/*!40000 ALTER TABLE `actions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_keys`
--

DROP TABLE IF EXISTS `api_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_keys` (
  `id` varchar(24) NOT NULL,
  `type` varchar(50) NOT NULL,
  `secret` varchar(191) NOT NULL,
  `role_id` varchar(24) DEFAULT NULL,
  `integration_id` varchar(24) DEFAULT NULL,
  `user_id` varchar(24) DEFAULT NULL,
  `last_seen_at` datetime DEFAULT NULL,
  `last_seen_version` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_keys_secret_unique` (`secret`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_keys`
--

LOCK TABLES `api_keys` WRITE;
/*!40000 ALTER TABLE `api_keys` DISABLE KEYS */;
INSERT INTO `api_keys` VALUES ('68ae38c239f9d451fc955140','admin','f287defb39291a4b7f938efb80d8d36f96008831467b8a1322f6c1f91a76a34c','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95513f',NULL,NULL,NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955142','admin','677b022e9b9e721542e3f5489a8f216582adb2336e47e899b9580a6e81221950','68ae38c139f9d451fc9550b0','68ae38c239f9d451fc955141',NULL,NULL,NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955144','admin','91bf0d3671867a755ada7a4fbc4ac8afddeff0752b335ac2f5bd22a9b4cdeeea','68ae38c139f9d451fc9550b1','68ae38c239f9d451fc955143',NULL,NULL,NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955146','admin','37b38cda528e242119a008dda5c65bc98fd65f26ac54d07c2c4b593bdf2f4262','68ae38c139f9d451fc9550b2','68ae38c239f9d451fc955145',NULL,NULL,NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955148','admin','7e78842aebd5ac601dd8981ada877449ac7db24e041947b82e60fc762fc8a791','68ae38c139f9d451fc9550b3','68ae38c239f9d451fc955147',NULL,NULL,NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95514a','content','582acb40b1bf53aa18063e48ec',NULL,'68ae38c239f9d451fc955149',NULL,NULL,NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18');
/*!40000 ALTER TABLE `api_keys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `benefits`
--

DROP TABLE IF EXISTS `benefits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `benefits` (
  `id` varchar(24) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `benefits_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `benefits`
--

LOCK TABLES `benefits` WRITE;
/*!40000 ALTER TABLE `benefits` DISABLE KEYS */;
/*!40000 ALTER TABLE `benefits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brute`
--

DROP TABLE IF EXISTS `brute`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brute` (
  `key` varchar(191) NOT NULL,
  `firstRequest` bigint NOT NULL,
  `lastRequest` bigint NOT NULL,
  `lifetime` bigint NOT NULL,
  `count` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brute`
--

LOCK TABLES `brute` WRITE;
/*!40000 ALTER TABLE `brute` DISABLE KEYS */;
/*!40000 ALTER TABLE `brute` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collections`
--

DROP TABLE IF EXISTS `collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collections` (
  `id` varchar(24) NOT NULL,
  `title` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` varchar(2000) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `filter` text,
  `feature_image` varchar(2000) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `collections_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collections`
--

LOCK TABLES `collections` WRITE;
/*!40000 ALTER TABLE `collections` DISABLE KEYS */;
INSERT INTO `collections` VALUES ('68ae38c239f9d451fc9550b7','Latest','latest','All posts','automatic',NULL,NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550b8','Featured','featured','Featured posts','automatic','featured:true',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18');
/*!40000 ALTER TABLE `collections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collections_posts`
--

DROP TABLE IF EXISTS `collections_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collections_posts` (
  `id` varchar(24) NOT NULL,
  `collection_id` varchar(24) NOT NULL,
  `post_id` varchar(24) NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `collections_posts_collection_id_foreign` (`collection_id`),
  KEY `collections_posts_post_id_foreign` (`post_id`),
  CONSTRAINT `collections_posts_collection_id_foreign` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collections_posts_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collections_posts`
--

LOCK TABLES `collections_posts` WRITE;
/*!40000 ALTER TABLE `collections_posts` DISABLE KEYS */;
INSERT INTO `collections_posts` VALUES ('68ae38c239f9d451fc9552ed','68ae38c239f9d451fc9550b7','6194d3ce51e2700162531a71',0),('68ae38c239f9d451fc9552ee','68ae38c239f9d451fc9550b7','6194d3ce51e2700162531a72',0),('68ae38c239f9d451fc9552ef','68ae38c239f9d451fc9550b7','6194d3ce51e2700162531a73',0),('68ae38c239f9d451fc9552f0','68ae38c239f9d451fc9550b7','6194d3ce51e2700162531a74',0),('68ae38c239f9d451fc9552f1','68ae38c239f9d451fc9550b7','6194d3ce51e2700162531a75',0),('68ae38c239f9d451fc9552f2','68ae38c239f9d451fc9550b7','6194d3ce51e2700162531a76',0),('68ae38c239f9d451fc9552f3','68ae38c239f9d451fc9550b7','6194d3ce51e2700162531a77',0);
/*!40000 ALTER TABLE `collections_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comment_likes`
--

DROP TABLE IF EXISTS `comment_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment_likes` (
  `id` varchar(24) NOT NULL,
  `comment_id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comment_likes_comment_id_foreign` (`comment_id`),
  KEY `comment_likes_member_id_foreign` (`member_id`),
  CONSTRAINT `comment_likes_comment_id_foreign` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comment_likes_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comment_likes`
--

LOCK TABLES `comment_likes` WRITE;
/*!40000 ALTER TABLE `comment_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `comment_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comment_reports`
--

DROP TABLE IF EXISTS `comment_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment_reports` (
  `id` varchar(24) NOT NULL,
  `comment_id` varchar(24) NOT NULL,
  `member_id` varchar(24) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comment_reports_comment_id_foreign` (`comment_id`),
  KEY `comment_reports_member_id_foreign` (`member_id`),
  CONSTRAINT `comment_reports_comment_id_foreign` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comment_reports_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comment_reports`
--

LOCK TABLES `comment_reports` WRITE;
/*!40000 ALTER TABLE `comment_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `comment_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `id` varchar(24) NOT NULL,
  `post_id` varchar(24) NOT NULL,
  `member_id` varchar(24) DEFAULT NULL,
  `parent_id` varchar(24) DEFAULT NULL,
  `in_reply_to_id` varchar(24) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'published',
  `html` longtext,
  `edited_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comments_post_id_foreign` (`post_id`),
  KEY `comments_member_id_foreign` (`member_id`),
  KEY `comments_parent_id_foreign` (`parent_id`),
  KEY `comments_in_reply_to_id_foreign` (`in_reply_to_id`),
  CONSTRAINT `comments_in_reply_to_id_foreign` FOREIGN KEY (`in_reply_to_id`) REFERENCES `comments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `comments_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL,
  CONSTRAINT `comments_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comments_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comments`
--

LOCK TABLES `comments` WRITE;
/*!40000 ALTER TABLE `comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `custom_theme_settings`
--

DROP TABLE IF EXISTS `custom_theme_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_theme_settings` (
  `id` varchar(24) NOT NULL,
  `theme` varchar(191) NOT NULL,
  `key` varchar(191) NOT NULL,
  `type` varchar(50) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `custom_theme_settings`
--

LOCK TABLES `custom_theme_settings` WRITE;
/*!40000 ALTER TABLE `custom_theme_settings` DISABLE KEYS */;
INSERT INTO `custom_theme_settings` VALUES ('68ae38c339f9d451fc955360','source','navigation_layout','select','Logo in the middle'),('68ae38c339f9d451fc955361','source','site_background_color','color','#ffffff'),('68ae38c339f9d451fc955362','source','header_and_footer_color','select','Background color'),('68ae38c339f9d451fc955363','source','title_font','select','Modern sans-serif'),('68ae38c339f9d451fc955364','source','body_font','select','Modern sans-serif'),('68ae38c339f9d451fc955365','source','signup_heading','text',NULL),('68ae38c339f9d451fc955366','source','signup_subheading','text',NULL),('68ae38c339f9d451fc955367','source','header_style','select','Landing'),('68ae38c339f9d451fc955368','source','header_text','text',NULL),('68ae38c339f9d451fc955369','source','background_image','boolean','true'),('68ae38c339f9d451fc95536a','source','show_featured_posts','boolean','false'),('68ae38c339f9d451fc95536b','source','post_feed_style','select','List'),('68ae38c339f9d451fc95536c','source','show_images_in_feed','boolean','true'),('68ae38c339f9d451fc95536d','source','show_author','boolean','true'),('68ae38c339f9d451fc95536e','source','show_publish_date','boolean','true'),('68ae38c339f9d451fc95536f','source','show_publication_info_sidebar','boolean','false'),('68ae38c339f9d451fc955370','source','show_post_metadata','boolean','true'),('68ae38c339f9d451fc955371','source','enable_drop_caps_on_posts','boolean','false'),('68ae38c339f9d451fc955372','source','show_related_articles','boolean','true');
/*!40000 ALTER TABLE `custom_theme_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donation_payment_events`
--

DROP TABLE IF EXISTS `donation_payment_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donation_payment_events` (
  `id` varchar(24) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  `email` varchar(191) NOT NULL,
  `member_id` varchar(24) DEFAULT NULL,
  `amount` int NOT NULL,
  `currency` varchar(50) NOT NULL,
  `attribution_id` varchar(24) DEFAULT NULL,
  `attribution_type` varchar(50) DEFAULT NULL,
  `attribution_url` varchar(2000) DEFAULT NULL,
  `referrer_source` varchar(191) DEFAULT NULL,
  `referrer_medium` varchar(191) DEFAULT NULL,
  `referrer_url` varchar(2000) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `donation_message` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `donation_payment_events_member_id_foreign` (`member_id`),
  CONSTRAINT `donation_payment_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donation_payment_events`
--

LOCK TABLES `donation_payment_events` WRITE;
/*!40000 ALTER TABLE `donation_payment_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `donation_payment_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_batches`
--

DROP TABLE IF EXISTS `email_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_batches` (
  `id` varchar(24) NOT NULL,
  `email_id` varchar(24) NOT NULL,
  `provider_id` varchar(255) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `member_segment` text,
  `error_status_code` int unsigned DEFAULT NULL,
  `error_message` varchar(2000) DEFAULT NULL,
  `error_data` longtext,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `email_batches_email_id_foreign` (`email_id`),
  CONSTRAINT `email_batches_email_id_foreign` FOREIGN KEY (`email_id`) REFERENCES `emails` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_batches`
--

LOCK TABLES `email_batches` WRITE;
/*!40000 ALTER TABLE `email_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_recipient_failures`
--

DROP TABLE IF EXISTS `email_recipient_failures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_recipient_failures` (
  `id` varchar(24) NOT NULL,
  `email_id` varchar(24) NOT NULL,
  `member_id` varchar(24) DEFAULT NULL,
  `email_recipient_id` varchar(24) NOT NULL,
  `code` int unsigned NOT NULL,
  `enhanced_code` varchar(50) DEFAULT NULL,
  `message` varchar(2000) NOT NULL,
  `severity` varchar(50) NOT NULL DEFAULT 'permanent',
  `failed_at` datetime NOT NULL,
  `event_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `email_recipient_failures_email_id_foreign` (`email_id`),
  KEY `email_recipient_failures_email_recipient_id_foreign` (`email_recipient_id`),
  CONSTRAINT `email_recipient_failures_email_id_foreign` FOREIGN KEY (`email_id`) REFERENCES `emails` (`id`),
  CONSTRAINT `email_recipient_failures_email_recipient_id_foreign` FOREIGN KEY (`email_recipient_id`) REFERENCES `email_recipients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_recipient_failures`
--

LOCK TABLES `email_recipient_failures` WRITE;
/*!40000 ALTER TABLE `email_recipient_failures` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_recipient_failures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_recipients`
--

DROP TABLE IF EXISTS `email_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_recipients` (
  `id` varchar(24) NOT NULL,
  `email_id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `batch_id` varchar(24) NOT NULL,
  `processed_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `opened_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  `member_uuid` varchar(36) NOT NULL,
  `member_email` varchar(191) NOT NULL,
  `member_name` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `email_recipients_member_id_index` (`member_id`),
  KEY `email_recipients_batch_id_foreign` (`batch_id`),
  KEY `email_recipients_email_id_member_email_index` (`email_id`,`member_email`),
  KEY `email_recipients_email_id_delivered_at_index` (`email_id`,`delivered_at`),
  KEY `email_recipients_email_id_opened_at_index` (`email_id`,`opened_at`),
  KEY `email_recipients_email_id_failed_at_index` (`email_id`,`failed_at`),
  CONSTRAINT `email_recipients_batch_id_foreign` FOREIGN KEY (`batch_id`) REFERENCES `email_batches` (`id`),
  CONSTRAINT `email_recipients_email_id_foreign` FOREIGN KEY (`email_id`) REFERENCES `emails` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_recipients`
--

LOCK TABLES `email_recipients` WRITE;
/*!40000 ALTER TABLE `email_recipients` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_recipients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_spam_complaint_events`
--

DROP TABLE IF EXISTS `email_spam_complaint_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_spam_complaint_events` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `email_id` varchar(24) NOT NULL,
  `email_address` varchar(191) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_spam_complaint_events_email_id_member_id_unique` (`email_id`,`member_id`),
  KEY `email_spam_complaint_events_member_id_foreign` (`member_id`),
  CONSTRAINT `email_spam_complaint_events_email_id_foreign` FOREIGN KEY (`email_id`) REFERENCES `emails` (`id`),
  CONSTRAINT `email_spam_complaint_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_spam_complaint_events`
--

LOCK TABLES `email_spam_complaint_events` WRITE;
/*!40000 ALTER TABLE `email_spam_complaint_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_spam_complaint_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emails`
--

DROP TABLE IF EXISTS `emails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emails` (
  `id` varchar(24) NOT NULL,
  `post_id` varchar(24) NOT NULL,
  `uuid` varchar(36) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `recipient_filter` text NOT NULL,
  `error` varchar(2000) DEFAULT NULL,
  `error_data` longtext,
  `email_count` int unsigned NOT NULL DEFAULT '0',
  `delivered_count` int unsigned NOT NULL DEFAULT '0',
  `opened_count` int unsigned NOT NULL DEFAULT '0',
  `failed_count` int unsigned NOT NULL DEFAULT '0',
  `subject` varchar(300) DEFAULT NULL,
  `from` varchar(2000) DEFAULT NULL,
  `reply_to` varchar(2000) DEFAULT NULL,
  `html` longtext,
  `plaintext` longtext,
  `source` longtext,
  `source_type` varchar(50) NOT NULL DEFAULT 'html',
  `track_opens` tinyint(1) NOT NULL DEFAULT '0',
  `track_clicks` tinyint(1) NOT NULL DEFAULT '0',
  `feedback_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `submitted_at` datetime NOT NULL,
  `newsletter_id` varchar(24) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `emails_post_id_unique` (`post_id`),
  KEY `emails_post_id_index` (`post_id`),
  KEY `emails_newsletter_id_foreign` (`newsletter_id`),
  CONSTRAINT `emails_newsletter_id_foreign` FOREIGN KEY (`newsletter_id`) REFERENCES `newsletters` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emails`
--

LOCK TABLES `emails` WRITE;
/*!40000 ALTER TABLE `emails` DISABLE KEYS */;
/*!40000 ALTER TABLE `emails` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `integrations`
--

DROP TABLE IF EXISTS `integrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `integrations` (
  `id` varchar(24) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'custom',
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `icon_image` varchar(2000) DEFAULT NULL,
  `description` varchar(2000) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `integrations_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `integrations`
--

LOCK TABLES `integrations` WRITE;
/*!40000 ALTER TABLE `integrations` DISABLE KEYS */;
INSERT INTO `integrations` VALUES ('68ae38c239f9d451fc95513f','builtin','Zapier','zapier',NULL,'Built-in Zapier integration','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955141','core','Ghost Explore','ghost-explore',NULL,'Built-in Ghost Explore integration','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955143','core','Self-Serve Migration Integration','self-serve-migration',NULL,'Core Self-Serve Migration integration','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955145','internal','Ghost Backup','ghost-backup',NULL,'Internal DB Backup integration','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955147','internal','Ghost Scheduler','ghost-scheduler',NULL,'Internal Scheduler integration','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955149','internal','Ghost Internal Frontend','ghost-internal-frontend',NULL,'Internal frontend integration','2025-08-26 22:44:18','2025-08-26 22:44:18');
/*!40000 ALTER TABLE `integrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invites`
--

DROP TABLE IF EXISTS `invites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invites` (
  `id` varchar(24) NOT NULL,
  `role_id` varchar(24) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `token` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `expires` bigint NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invites_token_unique` (`token`),
  UNIQUE KEY `invites_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invites`
--

LOCK TABLES `invites` WRITE;
/*!40000 ALTER TABLE `invites` DISABLE KEYS */;
/*!40000 ALTER TABLE `invites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` varchar(24) NOT NULL,
  `name` varchar(191) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'queued',
  `started_at` datetime DEFAULT NULL,
  `finished_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `metadata` varchar(2000) DEFAULT NULL,
  `queue_entry` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jobs_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `labels`
--

DROP TABLE IF EXISTS `labels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `labels` (
  `id` varchar(24) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `labels_name_unique` (`name`),
  UNIQUE KEY `labels_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `labels`
--

LOCK TABLES `labels` WRITE;
/*!40000 ALTER TABLE `labels` DISABLE KEYS */;
/*!40000 ALTER TABLE `labels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members`
--

DROP TABLE IF EXISTS `members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members` (
  `id` varchar(24) NOT NULL,
  `uuid` varchar(36) NOT NULL,
  `transient_id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'free',
  `name` varchar(191) DEFAULT NULL,
  `expertise` varchar(191) DEFAULT NULL,
  `note` varchar(2000) DEFAULT NULL,
  `geolocation` varchar(2000) DEFAULT NULL,
  `enable_comment_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `email_count` int unsigned NOT NULL DEFAULT '0',
  `email_opened_count` int unsigned NOT NULL DEFAULT '0',
  `email_open_rate` int unsigned DEFAULT NULL,
  `email_disabled` tinyint(1) NOT NULL DEFAULT '0',
  `last_seen_at` datetime DEFAULT NULL,
  `last_commented_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `members_uuid_unique` (`uuid`),
  UNIQUE KEY `members_transient_id_unique` (`transient_id`),
  UNIQUE KEY `members_email_unique` (`email`),
  KEY `members_email_open_rate_index` (`email_open_rate`),
  KEY `members_email_disabled_index` (`email_disabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members`
--

LOCK TABLES `members` WRITE;
/*!40000 ALTER TABLE `members` DISABLE KEYS */;
/*!40000 ALTER TABLE `members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_cancel_events`
--

DROP TABLE IF EXISTS `members_cancel_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_cancel_events` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `from_plan` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `members_cancel_events_member_id_foreign` (`member_id`),
  CONSTRAINT `members_cancel_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_cancel_events`
--

LOCK TABLES `members_cancel_events` WRITE;
/*!40000 ALTER TABLE `members_cancel_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_cancel_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_click_events`
--

DROP TABLE IF EXISTS `members_click_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_click_events` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `redirect_id` varchar(24) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `members_click_events_member_id_foreign` (`member_id`),
  KEY `members_click_events_redirect_id_foreign` (`redirect_id`),
  CONSTRAINT `members_click_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `members_click_events_redirect_id_foreign` FOREIGN KEY (`redirect_id`) REFERENCES `redirects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_click_events`
--

LOCK TABLES `members_click_events` WRITE;
/*!40000 ALTER TABLE `members_click_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_click_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_created_events`
--

DROP TABLE IF EXISTS `members_created_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_created_events` (
  `id` varchar(24) NOT NULL,
  `created_at` datetime NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `attribution_id` varchar(24) DEFAULT NULL,
  `attribution_type` varchar(50) DEFAULT NULL,
  `attribution_url` varchar(2000) DEFAULT NULL,
  `referrer_source` varchar(191) DEFAULT NULL,
  `referrer_medium` varchar(191) DEFAULT NULL,
  `referrer_url` varchar(2000) DEFAULT NULL,
  `source` varchar(50) NOT NULL,
  `batch_id` varchar(24) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `members_created_events_member_id_foreign` (`member_id`),
  KEY `members_created_events_attribution_id_index` (`attribution_id`),
  CONSTRAINT `members_created_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_created_events`
--

LOCK TABLES `members_created_events` WRITE;
/*!40000 ALTER TABLE `members_created_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_created_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_email_change_events`
--

DROP TABLE IF EXISTS `members_email_change_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_email_change_events` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `to_email` varchar(191) NOT NULL,
  `from_email` varchar(191) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `members_email_change_events_member_id_foreign` (`member_id`),
  CONSTRAINT `members_email_change_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_email_change_events`
--

LOCK TABLES `members_email_change_events` WRITE;
/*!40000 ALTER TABLE `members_email_change_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_email_change_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_feedback`
--

DROP TABLE IF EXISTS `members_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_feedback` (
  `id` varchar(24) NOT NULL,
  `score` int unsigned NOT NULL DEFAULT '0',
  `member_id` varchar(24) NOT NULL,
  `post_id` varchar(24) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `members_feedback_member_id_foreign` (`member_id`),
  KEY `members_feedback_post_id_foreign` (`post_id`),
  CONSTRAINT `members_feedback_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `members_feedback_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_feedback`
--

LOCK TABLES `members_feedback` WRITE;
/*!40000 ALTER TABLE `members_feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_labels`
--

DROP TABLE IF EXISTS `members_labels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_labels` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `label_id` varchar(24) NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `members_labels_member_id_foreign` (`member_id`),
  KEY `members_labels_label_id_foreign` (`label_id`),
  CONSTRAINT `members_labels_label_id_foreign` FOREIGN KEY (`label_id`) REFERENCES `labels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `members_labels_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_labels`
--

LOCK TABLES `members_labels` WRITE;
/*!40000 ALTER TABLE `members_labels` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_labels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_login_events`
--

DROP TABLE IF EXISTS `members_login_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_login_events` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `members_login_events_member_id_foreign` (`member_id`),
  CONSTRAINT `members_login_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_login_events`
--

LOCK TABLES `members_login_events` WRITE;
/*!40000 ALTER TABLE `members_login_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_login_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_newsletters`
--

DROP TABLE IF EXISTS `members_newsletters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_newsletters` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `newsletter_id` varchar(24) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `members_newsletters_member_id_foreign` (`member_id`),
  KEY `members_newsletters_newsletter_id_member_id_index` (`newsletter_id`,`member_id`),
  CONSTRAINT `members_newsletters_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `members_newsletters_newsletter_id_foreign` FOREIGN KEY (`newsletter_id`) REFERENCES `newsletters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_newsletters`
--

LOCK TABLES `members_newsletters` WRITE;
/*!40000 ALTER TABLE `members_newsletters` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_newsletters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_paid_subscription_events`
--

DROP TABLE IF EXISTS `members_paid_subscription_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_paid_subscription_events` (
  `id` varchar(24) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `member_id` varchar(24) NOT NULL,
  `subscription_id` varchar(24) DEFAULT NULL,
  `from_plan` varchar(255) DEFAULT NULL,
  `to_plan` varchar(255) DEFAULT NULL,
  `currency` varchar(191) NOT NULL,
  `source` varchar(50) NOT NULL,
  `mrr_delta` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `members_paid_subscription_events_member_id_foreign` (`member_id`),
  CONSTRAINT `members_paid_subscription_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_paid_subscription_events`
--

LOCK TABLES `members_paid_subscription_events` WRITE;
/*!40000 ALTER TABLE `members_paid_subscription_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_paid_subscription_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_payment_events`
--

DROP TABLE IF EXISTS `members_payment_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_payment_events` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `amount` int NOT NULL,
  `currency` varchar(191) NOT NULL,
  `source` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `members_payment_events_member_id_foreign` (`member_id`),
  CONSTRAINT `members_payment_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_payment_events`
--

LOCK TABLES `members_payment_events` WRITE;
/*!40000 ALTER TABLE `members_payment_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_payment_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_product_events`
--

DROP TABLE IF EXISTS `members_product_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_product_events` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `product_id` varchar(24) NOT NULL,
  `action` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `members_product_events_member_id_foreign` (`member_id`),
  KEY `members_product_events_product_id_foreign` (`product_id`),
  CONSTRAINT `members_product_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `members_product_events_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_product_events`
--

LOCK TABLES `members_product_events` WRITE;
/*!40000 ALTER TABLE `members_product_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_product_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_products`
--

DROP TABLE IF EXISTS `members_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_products` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `product_id` varchar(24) NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `expiry_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `members_products_member_id_foreign` (`member_id`),
  KEY `members_products_product_id_foreign` (`product_id`),
  CONSTRAINT `members_products_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `members_products_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_products`
--

LOCK TABLES `members_products` WRITE;
/*!40000 ALTER TABLE `members_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_status_events`
--

DROP TABLE IF EXISTS `members_status_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_status_events` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `from_status` varchar(50) DEFAULT NULL,
  `to_status` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `members_status_events_member_id_foreign` (`member_id`),
  CONSTRAINT `members_status_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_status_events`
--

LOCK TABLES `members_status_events` WRITE;
/*!40000 ALTER TABLE `members_status_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_status_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_stripe_customers`
--

DROP TABLE IF EXISTS `members_stripe_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_stripe_customers` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `customer_id` varchar(255) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `members_stripe_customers_customer_id_unique` (`customer_id`),
  KEY `members_stripe_customers_member_id_foreign` (`member_id`),
  CONSTRAINT `members_stripe_customers_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_stripe_customers`
--

LOCK TABLES `members_stripe_customers` WRITE;
/*!40000 ALTER TABLE `members_stripe_customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_stripe_customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_stripe_customers_subscriptions`
--

DROP TABLE IF EXISTS `members_stripe_customers_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_stripe_customers_subscriptions` (
  `id` varchar(24) NOT NULL,
  `customer_id` varchar(255) NOT NULL,
  `ghost_subscription_id` varchar(24) DEFAULT NULL,
  `subscription_id` varchar(255) NOT NULL,
  `stripe_price_id` varchar(255) NOT NULL DEFAULT '',
  `status` varchar(50) NOT NULL,
  `cancel_at_period_end` tinyint(1) NOT NULL DEFAULT '0',
  `cancellation_reason` varchar(500) DEFAULT NULL,
  `current_period_end` datetime NOT NULL,
  `start_date` datetime NOT NULL,
  `default_payment_card_last4` varchar(4) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `mrr` int unsigned NOT NULL DEFAULT '0',
  `offer_id` varchar(24) DEFAULT NULL,
  `trial_start_at` datetime DEFAULT NULL,
  `trial_end_at` datetime DEFAULT NULL,
  `plan_id` varchar(255) NOT NULL,
  `plan_nickname` varchar(50) NOT NULL,
  `plan_interval` varchar(50) NOT NULL,
  `plan_amount` int NOT NULL,
  `plan_currency` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `members_stripe_customers_subscriptions_subscription_id_unique` (`subscription_id`),
  KEY `members_stripe_customers_subscriptions_customer_id_foreign` (`customer_id`),
  KEY `mscs_ghost_subscription_id_foreign` (`ghost_subscription_id`),
  KEY `members_stripe_customers_subscriptions_stripe_price_id_index` (`stripe_price_id`),
  KEY `members_stripe_customers_subscriptions_offer_id_foreign` (`offer_id`),
  CONSTRAINT `members_stripe_customers_subscriptions_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `members_stripe_customers` (`customer_id`) ON DELETE CASCADE,
  CONSTRAINT `members_stripe_customers_subscriptions_offer_id_foreign` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`),
  CONSTRAINT `mscs_ghost_subscription_id_foreign` FOREIGN KEY (`ghost_subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_stripe_customers_subscriptions`
--

LOCK TABLES `members_stripe_customers_subscriptions` WRITE;
/*!40000 ALTER TABLE `members_stripe_customers_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_stripe_customers_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_subscribe_events`
--

DROP TABLE IF EXISTS `members_subscribe_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_subscribe_events` (
  `id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `subscribed` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `source` varchar(50) DEFAULT NULL,
  `newsletter_id` varchar(24) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `members_subscribe_events_member_id_foreign` (`member_id`),
  KEY `members_subscribe_events_newsletter_id_created_at_index` (`newsletter_id`,`created_at`),
  CONSTRAINT `members_subscribe_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `members_subscribe_events_newsletter_id_foreign` FOREIGN KEY (`newsletter_id`) REFERENCES `newsletters` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_subscribe_events`
--

LOCK TABLES `members_subscribe_events` WRITE;
/*!40000 ALTER TABLE `members_subscribe_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_subscribe_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members_subscription_created_events`
--

DROP TABLE IF EXISTS `members_subscription_created_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members_subscription_created_events` (
  `id` varchar(24) NOT NULL,
  `created_at` datetime NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `subscription_id` varchar(24) NOT NULL,
  `attribution_id` varchar(24) DEFAULT NULL,
  `attribution_type` varchar(50) DEFAULT NULL,
  `attribution_url` varchar(2000) DEFAULT NULL,
  `referrer_source` varchar(191) DEFAULT NULL,
  `referrer_medium` varchar(191) DEFAULT NULL,
  `referrer_url` varchar(2000) DEFAULT NULL,
  `batch_id` varchar(24) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `members_subscription_created_events_member_id_foreign` (`member_id`),
  KEY `members_subscription_created_events_subscription_id_foreign` (`subscription_id`),
  KEY `members_subscription_created_events_attribution_id_index` (`attribution_id`),
  CONSTRAINT `members_subscription_created_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `members_subscription_created_events_subscription_id_foreign` FOREIGN KEY (`subscription_id`) REFERENCES `members_stripe_customers_subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members_subscription_created_events`
--

LOCK TABLES `members_subscription_created_events` WRITE;
/*!40000 ALTER TABLE `members_subscription_created_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `members_subscription_created_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mentions`
--

DROP TABLE IF EXISTS `mentions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mentions` (
  `id` varchar(24) NOT NULL,
  `source` varchar(2000) NOT NULL,
  `source_title` varchar(2000) DEFAULT NULL,
  `source_site_title` varchar(2000) DEFAULT NULL,
  `source_excerpt` varchar(2000) DEFAULT NULL,
  `source_author` varchar(2000) DEFAULT NULL,
  `source_featured_image` varchar(2000) DEFAULT NULL,
  `source_favicon` varchar(2000) DEFAULT NULL,
  `target` varchar(2000) NOT NULL,
  `resource_id` varchar(24) DEFAULT NULL,
  `resource_type` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `payload` text,
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `verified` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mentions`
--

LOCK TABLES `mentions` WRITE;
/*!40000 ALTER TABLE `mentions` DISABLE KEYS */;
/*!40000 ALTER TABLE `mentions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `version` varchar(70) NOT NULL,
  `currentVersion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `migrations_name_version_unique` (`name`,`version`)
) ENGINE=InnoDB AUTO_INCREMENT=230 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'1-create-tables.js','init','6.0'),(2,'2-create-fixtures.js','init','6.0'),(3,'01-final-v1.js','1.25','6.0'),(4,'02-noop.js','1.25','6.0'),(5,'01-final-v2.js','2.37','6.0'),(6,'01-final-v3.js','3.41','6.0'),(7,'2022-05-03-15-30-final-v4.js','4.47','6.0'),(8,'2022-05-04-10-03-no-op.js','4.47','6.0'),(9,'2022-03-14-12-33-delete-duplicate-offer-redemptions.js','5.0','6.0'),(10,'2022-03-28-15-25-backfill-mrr-adjustments-for-offers.js','5.0','6.0'),(11,'2022-04-25-10-32-backfill-mrr-for-discounted-subscriptions.js','5.0','6.0'),(12,'2022-04-26-15-44-backfill-mrr-events-for-canceled-subscriptions.js','5.0','6.0'),(13,'2022-04-27-11-26-backfill-mrr-for-canceled-subscriptions.js','5.0','6.0'),(14,'2022-04-28-03-26-remove-author-id-column-from-posts-table.js','5.0','6.0'),(15,'2022-05-03-09-39-drop-nullable-subscribe-event-newsletter-id.js','5.0','6.0'),(16,'2022-05-04-15-24-map-existing-emails-to-default-newsletter.js','5.0','6.0'),(17,'2022-05-05-13-13-migrate-legacy-recipient-filters.js','5.0','6.0'),(18,'2022-05-05-13-29-add-newsletters-admin-integration-permission-roles.js','5.0','6.0'),(19,'2022-05-05-15-17-drop-oauth-table.js','5.0','6.0'),(20,'2022-05-06-08-16-cleanup-client-subscriber-permissions.js','5.0','6.0'),(21,'2022-05-06-13-22-add-frontend-integration.js','5.0','6.0'),(22,'2022-05-09-10-00-drop-members-subscribed-column.js','5.0','6.0'),(23,'2022-05-09-14-17-cleanup-invalid-users-status.js','5.0','6.0'),(24,'2022-05-10-08-33-drop-members-analytics-table.js','5.0','6.0'),(25,'2022-05-10-14-57-cleanup-invalid-posts-status.js','5.0','6.0'),(26,'2022-05-11-12-08-drop-webhooks-status-column.js','5.0','6.0'),(27,'2022-05-11-13-12-rename-settings.js','5.0','6.0'),(28,'2022-05-11-16-36-remove-unused-settings.js','5.0','6.0'),(29,'2022-05-12-10-29-add-newsletter-permissions-for-editors-and-authors.js','5.0','6.0'),(30,'2022-05-12-13-51-add-label-permissions-for-authors.js','5.0','6.0'),(31,'2022-05-13-11-38-drop-none-email-recipient-filter.js','5.0','6.0'),(32,'2022-05-21-00-00-regenerate-posts-html.js','5.0','6.0'),(33,'2022-07-04-13-49-add-comments-table.js','5.3','6.0'),(34,'2022-07-05-09-36-add-comments-likes-table.js','5.3','6.0'),(35,'2022-07-05-09-47-add-comments-reports-table.js','5.3','6.0'),(36,'2022-07-05-10-00-add-comment-related-fields-to-members.js','5.3','6.0'),(37,'2022-07-05-12-55-add-comments-crud-permissions.js','5.3','6.0'),(38,'2022-07-05-15-35-add-comment-notifications-field-to-users-table.js','5.3','6.0'),(39,'2022-07-06-07-26-add-comments-enabled-setting.js','5.3','6.0'),(40,'2022-07-06-07-58-add-ghost-explore-integration-role.js','5.3','6.0'),(41,'2022-07-06-09-13-add-ghost-explore-integration-role-permissions.js','5.3','6.0'),(42,'2022-07-06-09-17-add-ghost-explore-integration.js','5.3','6.0'),(43,'2022-07-06-09-26-add-ghost-explore-integration-api-key.js','5.3','6.0'),(44,'2022-07-18-14-29-add-comment-reporting-permissions.js','5.5','6.0'),(45,'2022-07-18-14-31-drop-reports-reason.js','5.5','6.0'),(46,'2022-07-18-14-32-drop-nullable-member-id-from-likes.js','5.5','6.0'),(47,'2022-07-18-14-33-fix-comments-on-delete-foreign-keys.js','5.5','6.0'),(48,'2022-07-21-08-56-add-jobs-table.js','5.5','6.0'),(49,'2022-07-27-13-40-change-explore-type.js','5.6','6.0'),(50,'2022-08-02-06-09-add-trial-period-days-column-to-tiers.js','5.8','6.0'),(51,'2022-08-03-15-28-add-trial-start-column-to-stripe-subscriptions.js','5.8','6.0'),(52,'2022-08-03-15-29-add-trial-end-column-to-stripe-subscriptions.js','5.8','6.0'),(53,'2022-08-09-08-32-added-new-integration-type.js','5.9','6.0'),(54,'2022-08-15-05-34-add-expiry-at-column-to-members-products.js','5.10','6.0'),(55,'2022-08-16-14-25-add-member-created-events-table.js','5.10','6.0'),(56,'2022-08-16-14-25-add-subscription-created-events-table.js','5.10','6.0'),(57,'2022-08-19-14-15-fix-comments-deletion-strategy.js','5.10','6.0'),(58,'2022-08-22-11-03-add-member-alert-settings-columns-to-users.js','5.11','6.0'),(59,'2022-08-23-13-41-backfill-members-created-events.js','5.11','6.0'),(60,'2022-08-23-13-59-fix-page-resource-type.js','5.11','6.0'),(61,'2022-09-02-12-55-rename-members-bio-to-expertise.js','5.14','6.0'),(62,'2022-09-12-16-10-add-posts-lexical-column.js','5.15','6.0'),(63,'2022-09-14-12-46-add-email-track-clicks-setting.js','5.15','6.0'),(64,'2022-09-16-08-22-add-post-revisions-table.js','5.15','6.0'),(65,'2022-09-19-09-04-add-link-redirects-table.js','5.16','6.0'),(66,'2022-09-19-09-05-add-members-link-click-events-table.js','5.16','6.0'),(67,'2022-09-19-17-44-add-referrer-columns-to-member-events-table.js','5.16','6.0'),(68,'2022-09-19-17-44-add-referrer-columns-to-subscription-events-table.js','5.16','6.0'),(69,'2022-09-27-13-53-remove-click-tracking-tables.js','5.17','6.0'),(70,'2022-09-27-13-55-add-redirects-table.js','5.17','6.0'),(71,'2022-09-27-13-56-add-members-click-events-table.js','5.17','6.0'),(72,'2022-09-27-16-49-set-track-clicks-based-on-opens.js','5.17','6.0'),(73,'2022-09-29-12-39-add-track-clicks-column-to-emails.js','5.17','6.0'),(74,'2022-09-02-20-25-add-columns-to-products-table.js','5.19','6.0'),(75,'2022-09-02-20-52-backfill-new-product-columns.js','5.19','6.0'),(76,'2022-10-10-06-58-add-subscriptions-table.js','5.19','6.0'),(77,'2022-10-10-10-05-add-members-feedback-table.js','5.19','6.0'),(78,'2022-10-11-10-38-add-feedback-enabled-column-to-newsletters.js','5.19','6.0'),(79,'2022-10-18-05-39-drop-nullable-tier-id.js','5.20','6.0'),(80,'2022-10-18-10-13-add-ghost-subscription-id-column-to-mscs.js','5.20','6.0'),(81,'2022-10-19-11-17-add-link-browse-permissions.js','5.20','6.0'),(82,'2022-10-20-02-52-add-link-edit-permissions.js','5.20','6.0'),(83,'2022-10-24-07-23-disable-feedback-enabled.js','5.21','6.0'),(84,'2022-10-25-12-05-backfill-missed-products-columns.js','5.21','6.0'),(85,'2022-10-26-04-49-add-batch-id-members-created-events.js','5.21','6.0'),(86,'2022-10-26-04-49-add-batch-id-subscription-created-events.js','5.21','6.0'),(87,'2022-10-26-04-50-member-subscription-created-batch-id.js','5.21','6.0'),(88,'2022-10-26-09-32-add-feedback-enabled-column-to-emails.js','5.21','6.0'),(89,'2022-10-27-09-50-add-member-track-source-setting.js','5.21','6.0'),(90,'2022-10-31-12-03-backfill-new-product-columns.js','5.22','6.0'),(91,'2022-11-21-09-32-add-source-columns-to-emails-table.js','5.24','6.0'),(92,'2022-11-21-15-03-populate-source-column-with-html-for-emails.js','5.24','6.0'),(93,'2022-11-21-15-57-add-error-columns-for-email-batches.js','5.24','6.0'),(94,'2022-11-24-10-36-add-suppressions-table.js','5.25','6.0'),(95,'2022-11-24-10-37-add-email-spam-complaint-events-table.js','5.25','6.0'),(96,'2022-11-29-08-30-add-error-recipient-failures-table.js','5.25','6.0'),(97,'2022-12-13-16-15-add-usage-colums-to-tokens.js','5.27','6.0'),(98,'2023-01-04-04-12-drop-suppressions-table.js','5.27','6.0'),(99,'2023-01-04-04-13-add-suppressions-table.js','5.27','6.0'),(100,'2023-01-05-15-13-add-active-theme-permissions.js','5.28','6.0'),(101,'2023-01-11-02-45-truncate-suppressions.js','5.29','6.0'),(102,'2023-01-13-04-25-unsubscribe-suppressed-emails.js','5.30','6.0'),(103,'2022-12-05-09-56-update-newsletter-subscriptions.js','5.31','6.0'),(104,'2023-01-17-14-59-add-outbound-link-tagging-setting.js','5.31','6.0'),(105,'2023-01-19-07-46-add-mentions-table.js','5.31','6.0'),(106,'2023-01-24-08-00-fix-invalid-tier-expiry-for-paid-members.js','5.32','6.0'),(107,'2023-01-24-08-09-restore-incorrect-expired-tiers-for-members.js','5.32','6.0'),(108,'2023-01-30-07-27-add-mentions-permission.js','5.34','6.0'),(109,'2023-02-08-03-08-add-mentions-notifications-column.js','5.34','6.0'),(110,'2023-02-08-22-32-add-mentions-delete-column.js','5.34','6.0'),(111,'2023-02-13-06-24-add-mentions-verified-column.js','5.35','6.0'),(112,'2023-02-20-12-22-add-milestones-table.js','5.36','6.0'),(113,'2023-02-21-12-29-add-milestone-notifications-column.js','5.36','6.0'),(114,'2023-02-23-10-40-set-outbound-link-tagging-based-on-source-tracking.js','5.36','6.0'),(115,'2023-03-13-09-29-add-newsletter-show-post-title-section.js','5.39','6.0'),(116,'2023-03-13-13-11-add-newsletter-show-comment-cta.js','5.39','6.0'),(117,'2023-03-13-14-30-add-newsletter-show-subscription-details.js','5.39','6.0'),(118,'2023-03-14-12-26-add-last-mentions-email-report-timestamp-setting.js','5.39','6.0'),(119,'2023-03-13-14-05-add-newsletter-show-latest-posts.js','5.40','6.0'),(120,'2023-03-21-18-42-add-self-serve-integration-role.js','5.40','6.0'),(121,'2023-03-21-18-43-add-self-serve-migration-and-permissions.js','5.40','6.0'),(122,'2023-03-21-18-52-add-self-serve-integration.js','5.40','6.0'),(123,'2023-03-21-19-02-add-self-serve-integration-api-key.js','5.40','6.0'),(124,'2023-03-27-15-00-add-newsletter-colors.js','5.41','6.0'),(125,'2023-03-27-17-51-fix-self-serve-integration-api-key-type.js','5.41','6.0'),(126,'2023-04-04-07-03-add-portal-terms-settings.js','5.42','6.0'),(127,'2023-04-14-04-17-add-snippets-lexical-column.js','5.44','6.0'),(128,'2023-04-17-11-05-add-post-revision-author.js','5.45','6.0'),(129,'2023-04-18-12-56-add-announcement-settings.js','5.45','6.0'),(130,'2023-04-19-13-45-add-pintura-settings.js','5.45','6.0'),(131,'2023-04-20-14-19-add-announcement-visibility-setting.js','5.45','6.0'),(132,'2023-04-21-08-54-add-post-revision-status.js','5.45','6.0'),(133,'2023-04-21-10-30-add-feature-image-to-revisions.js','5.45','6.0'),(134,'2023-04-21-13-01-add-feature-image-meta-to-post-revisions.js','5.45','6.0'),(135,'2023-05-30-19-03-update-pintura-setting.js','5.51','6.0'),(136,'2023-06-07-10-17-add-collections-crud-persmissions.js','5.51','6.0'),(137,'2023-06-13-12-24-add-temp-mail-events-table.js','5.53','6.0'),(138,'2023-06-20-10-18-add-collections-table.js','5.53','6.0'),(139,'2023-06-20-10-19-add-collections-posts-table.js','5.53','6.0'),(140,'2023-07-07-11-57-add-show-title-and-feature-image-column-to-posts.js','5.54','6.0'),(141,'2023-07-10-05-15-55-add-built-in-collections.js','5.55','6.0'),(142,'2023-07-10-05-16-55-add-built-in-collection-posts.js','5.55','6.0'),(143,'2023-07-14-10-11-12-add-email-disabled-field-to-members.js','5.56','6.0'),(144,'2023-07-15-10-11-12-update-members-email-disabled-field.js','5.56','6.0'),(145,'2023-07-26-12-44-stripe-products-nullable-product.js','5.57','6.0'),(146,'2023-07-27-11-47-49-create-donation-events.js','5.57','6.0'),(147,'2023-08-02-09-42-add-donation-settings.js','5.58','6.0'),(148,'2023-08-07-10-42-add-donation-notifications-column.js','5.59','6.0'),(149,'2023-08-07-11-17-05-add-posts-published-at-index.js','5.59','6.0'),(150,'2023-08-29-10-17-add-recommendations-crud-permissions.js','5.61','6.0'),(151,'2023-08-29-11-39-10-add-recommendations-table.js','5.61','6.0'),(152,'2023-08-30-07-37-04-add-recommendations-enabled-settings.js','5.61','6.0'),(153,'2023-09-12-11-22-10-add-recommendation-click-events-table.js','5.63','6.0'),(154,'2023-09-12-11-22-11-add-recommendation-subscribe-events-table.js','5.63','6.0'),(155,'2023-09-13-13-03-10-add-ghost-core-content-integration.js','5.63','6.0'),(156,'2023-09-13-13-34-11-add-ghost-core-content-integration-key.js','5.63','6.0'),(157,'2023-09-19-04-25-40-truncate-stale-built-in-collections-posts.js','5.64','6.0'),(158,'2023-09-19-04-34-10-repopulate-built-in-collection-posts.js','5.64','6.0'),(159,'2023-09-22-06-42-15-truncate-stale-built-in-collections-posts.js','5.65','6.0'),(160,'2023-09-22-06-42-55-repopulate-built-in-featured-collection-posts.js','5.65','6.0'),(161,'2023-09-22-14-15-add-recommendation-notifications-column.js','5.66','6.0'),(162,'2023-10-03-00-32-32-rollback-source-theme.js','5.67','6.0'),(163,'2023-10-06-15-06-00-rename-recommendations-reason-to-description.js','5.69','6.0'),(164,'2023-10-31-11-06-00-members-created-attribution-id-index.js','5.72','6.0'),(165,'2023-10-31-11-06-01-members-subscription-created-attribution-id-index.js','5.72','6.0'),(166,'2023-11-14-11-15-00-add-transient-id-column-nullable.js','5.74','6.0'),(167,'2023-11-14-11-16-00-fill-transient-id-column.js','5.74','6.0'),(168,'2023-11-14-11-17-00-drop-nullable-transient-id-column.js','5.74','6.0'),(169,'2023-11-27-15-55-add-members-newsletters-index.js','5.75','6.0'),(170,'2023-12-05-11-00-add-portal-default-plan-setting.js','5.76','6.0'),(171,'2024-01-30-19-36-44-fix-discrepancy-in-free-tier-visibility.js','5.79','6.0'),(172,'2024-03-18-16-20-add-missing-post-permissions.js','5.81','6.0'),(173,'2024-03-25-16-46-10-add-email-recipients-email-id-indexes.js','5.82','6.0'),(174,'2024-03-25-16-51-29-drop-email-recipients-non-email-id-indexes.js','5.82','6.0'),(175,'2024-05-28-02-20-55-add-show-subhead-column-newsletters.js','5.83','6.0'),(176,'2024-06-04-09-13-33-rename-newsletters-show-subhead.js','5.84','6.0'),(177,'2024-06-04-11-10-37-add-custom-excerpt-to-post-revisions.js','5.84','6.0'),(178,'2024-06-05-08-42-34-populate-post-revisions-custom-excerpt.js','5.84','6.0'),(179,'2024-06-05-13-48-35-rename-newsletters-show-subtitle.js','5.84','6.0'),(180,'2024-06-10-14-53-31-add-posts-updated-at-index.js','5.85','6.0'),(181,'2024-06-25-12-08-20-add-posts-tags-post-tag-index.js','5.87','6.0'),(182,'2024-06-25-12-08-45-add-posts-type-status-updated-at-index.js','5.87','6.0'),(183,'2024-07-30-19-51-06-backfill-offer-redemptions.js','5.89','6.0'),(184,'2024-08-20-09-40-24-update-default-donations-suggested-amount.js','5.90','6.0'),(185,'2024-08-28-05-28-22-add-donation-message-column-to-donation-payment-events.js','5.91','6.0'),(186,'2024-09-03-18-51-01-update-stripe-prices-nickname-length.js','5.93','6.0'),(187,'2024-09-03-20-09-40-null-analytics-jobs-timings.js','5.94','6.0'),(188,'2024-10-08-14-25-27-added-body-font-settings.js','5.97','6.0'),(189,'2024-10-08-14-36-58-added-heading-font-setting.js','5.97','6.0'),(190,'2024-10-09-14-04-10-add-session-verification-field.js','5.97','6.0'),(191,'2024-10-10-01-02-03-add-signin-urls-permissions.js','5.97','6.0'),(192,'2024-10-31-15-27-42-add-jobs-queue-columns.js','5.100','6.0'),(193,'2024-11-05-14-48-08-add-comments-in-reply-to-id.js','5.100','6.0'),(194,'2024-11-06-04-45-15-add-activitypub-integration.js','5.100','6.0'),(195,'2024-12-02-17-32-40-alter-length-redirects-from.js','5.102','6.0'),(196,'2024-12-02-17-48-40-add-index-redirects-from.js','5.102','6.0'),(197,'2025-01-23-02-51-10-add-blocked-email-domains-setting.js','5.108','6.0'),(198,'2025-03-05-16-36-39-add-captcha-setting.js','5.111','6.0'),(199,'2025-03-10-10-01-01-add-require-mfa-setting.js','5.112','6.0'),(200,'2025-03-07-12-24-00-add-super-editor.js','5.113','6.0'),(201,'2025-03-07-12-25-00-add-member-perms-to-super-editor.js','5.113','6.0'),(202,'2025-03-19-03-13-04-add-index-to-posts-uuid.js','5.114','6.0'),(203,'2025-03-24-07-19-27-add-identity-read-permission-to-administrators.js','5.115','6.0'),(204,'2025-04-14-02-36-30-add-additional-social-accounts-columns-to-user-table.js','5.117','6.0'),(205,'2025-04-30-13-01-28-remove-captcha-setting.js','5.119','6.0'),(206,'2025-05-07-14-57-38-add-newsletters-button-corners-column.js','5.120','6.0'),(207,'2025-05-13-17-36-56-add-newsletters-button-style-column.js','5.120','6.0'),(208,'2025-05-14-20-00-15-add-newsletters-setting-columns.js','5.120','6.0'),(209,'2025-05-26-08-59-26-drop-newsletters-border-color-column.js','5.121','6.0'),(210,'2025-05-26-09-10-30-rename-newsletters-title-color-column.js','5.121','6.0'),(211,'2025-05-26-12-03-24-add-newsletters-color-columns.js','5.121','6.0'),(212,'2025-05-29-08-41-04-add-member-export-permissions-to-backup-integration.js','5.121','6.0'),(213,'2025-06-03-19-32-57-change-default-for-newsletters-button-color.js','5.122','6.0'),(214,'2025-06-06-23-12-11-create-site-uuid-setting.js','5.124','6.0'),(215,'2025-06-12-14-18-27-add-email-disabled-index.js','5.126','6.0'),(216,'2025-06-12-14-18-57-add-mse-newsletter-created-index.js','5.126','6.0'),(217,'2025-06-18-11-35-41-change-newsletters-link-color-default-to-accent.js','5.126','6.0'),(218,'2025-06-18-11-36-00-update-newsletters-link-color-null-to-accent.js','5.126','6.0'),(219,'2025-06-19-13-41-54-add-web-analytics-setting.js','5.127','6.0'),(220,'2025-06-26-09-36-41-add-social-web-setting.js','5.128','6.0'),(221,'2025-07-11-14-14-54-add-explore-settings.js','5.130','6.0'),(222,'2025-06-20-01-41-54-remove-updated-by-column.js','6.0','6.0'),(223,'2025-06-20-13-41-55-remove-created-by-column.js','6.0','6.0'),(224,'2025-06-23-09-49-25-add-missing-member-uuids.js','6.0','6.0'),(225,'2025-06-23-10-03-26-members-nullable-uuid.js','6.0','6.0'),(226,'2025-06-24-09-19-42-use-object-id-for-hardcoded-user-id.js','6.0','6.0'),(227,'2025-06-25-15-03-29-remove-amp-from-settings.js','6.0','6.0'),(228,'2025-06-30-13-59-10-remove-mail-events-table.js','6.0','6.0'),(229,'2025-06-30-14-00-00-update-feature-image-alt-length.js','6.0','6.0');
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations_lock`
--

DROP TABLE IF EXISTS `migrations_lock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations_lock` (
  `lock_key` varchar(191) NOT NULL,
  `locked` tinyint(1) DEFAULT '0',
  `acquired_at` datetime DEFAULT NULL,
  `released_at` datetime DEFAULT NULL,
  PRIMARY KEY (`lock_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations_lock`
--

LOCK TABLES `migrations_lock` WRITE;
/*!40000 ALTER TABLE `migrations_lock` DISABLE KEYS */;
INSERT INTO `migrations_lock` VALUES ('km01',0,'2025-08-26 22:44:15','2025-08-26 22:44:18');
/*!40000 ALTER TABLE `migrations_lock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `milestones`
--

DROP TABLE IF EXISTS `milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `milestones` (
  `id` varchar(24) NOT NULL,
  `type` varchar(24) NOT NULL,
  `value` int NOT NULL,
  `currency` varchar(24) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `email_sent_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `milestones`
--

LOCK TABLES `milestones` WRITE;
/*!40000 ALTER TABLE `milestones` DISABLE KEYS */;
/*!40000 ALTER TABLE `milestones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mobiledoc_revisions`
--

DROP TABLE IF EXISTS `mobiledoc_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mobiledoc_revisions` (
  `id` varchar(24) NOT NULL,
  `post_id` varchar(24) NOT NULL,
  `mobiledoc` longtext,
  `created_at_ts` bigint NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `mobiledoc_revisions_post_id_index` (`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mobiledoc_revisions`
--

LOCK TABLES `mobiledoc_revisions` WRITE;
/*!40000 ALTER TABLE `mobiledoc_revisions` DISABLE KEYS */;
INSERT INTO `mobiledoc_revisions` VALUES ('68ae38c439f9d451fc955373','6194d3ce51e2700162531a78','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[],\"markups\":[[\"strong\"],[\"code\"]],\"sections\":[[1,\"p\",[[0,[],0,\"Unlike posts, pages in Ghost don\'t appear in the main feed. They\'re separate, individual pages which only show up when you link to them. Great for content which is important, but separate from your usual posts.\"]]],[1,\"p\",[[0,[],0,\"An about page is a great example of one you might want to set up early on so people can find out more about you, and what you do. Why should people subscribe to your site and become a member? Details help!\"]]],[1,\"blockquote\",[[0,[0],1,\"Tip: \"],[0,[],0,\"If you\'re reading any post or page on your site and you notice something you want to edit, you can add \"],[0,[1],1,\"/edit\"],[0,[],0,\" to the end of the URL – and you\'ll be taken directly to the Ghost editor.\"]]],[1,\"p\",[[0,[],0,\"Now tell the world what your site is all about.\"]]]],\"ghostVersion\":\"4.0\"}',1756248260491,'2025-08-26 22:44:20'),('68ae38c439f9d451fc955374','6194d3ce51e2700162531a78','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"hr\",{}]],\"markups\":[[\"a\",[\"href\",\"https://ghost.org\"]]],\"sections\":[[1,\"p\",[[0,[],0,\"Test Blog is an independent publication launched in August 2025 by Test Admin. If you subscribe today, you\'ll get full access to the website as well as email newsletters about new content when it\'s available. Your subscription makes this site possible, and allows Test Blog to continue to exist. Thank you!\"]]],[1,\"h3\",[[0,[],0,\"Access all areas\"]]],[1,\"p\",[[0,[],0,\"By signing up, you\'ll get access to the full archive of everything that\'s been published before and everything that\'s still to come. Your very own private library.\"]]],[1,\"h3\",[[0,[],0,\"Fresh content, delivered\"]]],[1,\"p\",[[0,[],0,\"Stay up to date with new content sent straight to your inbox! No more worrying about whether you missed something because of a pesky algorithm or news feed.\"]]],[1,\"h3\",[[0,[],0,\"Meet people like you\"]]],[1,\"p\",[[0,[],0,\"Join a community of other subscribers who share the same interests.\"]]],[10,0],[1,\"h3\",[[0,[],0,\"Start your own thing\"]]],[1,\"p\",[[0,[],0,\"Enjoying the experience? Get started for free and set up your very own subscription business using \"],[0,[0],1,\"Ghost\"],[0,[],0,\", the same platform that powers this website.\"]]]],\"ghostVersion\":\"4.0\"}',1756248260492,'2025-08-26 22:44:20');
/*!40000 ALTER TABLE `mobiledoc_revisions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `newsletters`
--

DROP TABLE IF EXISTS `newsletters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `newsletters` (
  `id` varchar(24) NOT NULL,
  `uuid` varchar(36) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(2000) DEFAULT NULL,
  `feedback_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `slug` varchar(191) NOT NULL,
  `sender_name` varchar(191) DEFAULT NULL,
  `sender_email` varchar(191) DEFAULT NULL,
  `sender_reply_to` varchar(191) NOT NULL DEFAULT 'newsletter',
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `visibility` varchar(50) NOT NULL DEFAULT 'members',
  `subscribe_on_signup` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `header_image` varchar(2000) DEFAULT NULL,
  `show_header_icon` tinyint(1) NOT NULL DEFAULT '1',
  `show_header_title` tinyint(1) NOT NULL DEFAULT '1',
  `show_excerpt` tinyint(1) NOT NULL DEFAULT '0',
  `title_font_category` varchar(191) NOT NULL DEFAULT 'sans_serif',
  `title_alignment` varchar(191) NOT NULL DEFAULT 'center',
  `show_feature_image` tinyint(1) NOT NULL DEFAULT '1',
  `body_font_category` varchar(191) NOT NULL DEFAULT 'sans_serif',
  `footer_content` text,
  `show_badge` tinyint(1) NOT NULL DEFAULT '1',
  `show_header_name` tinyint(1) NOT NULL DEFAULT '1',
  `show_post_title_section` tinyint(1) NOT NULL DEFAULT '1',
  `show_comment_cta` tinyint(1) NOT NULL DEFAULT '1',
  `show_subscription_details` tinyint(1) NOT NULL DEFAULT '0',
  `show_latest_posts` tinyint(1) NOT NULL DEFAULT '0',
  `background_color` varchar(50) NOT NULL DEFAULT 'light',
  `post_title_color` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `button_corners` varchar(50) NOT NULL DEFAULT 'rounded',
  `button_style` varchar(50) NOT NULL DEFAULT 'fill',
  `title_font_weight` varchar(50) NOT NULL DEFAULT 'bold',
  `link_style` varchar(50) NOT NULL DEFAULT 'underline',
  `image_corners` varchar(50) NOT NULL DEFAULT 'square',
  `header_background_color` varchar(50) NOT NULL DEFAULT 'transparent',
  `section_title_color` varchar(50) DEFAULT NULL,
  `divider_color` varchar(50) DEFAULT NULL,
  `button_color` varchar(50) DEFAULT 'accent',
  `link_color` varchar(50) DEFAULT 'accent',
  PRIMARY KEY (`id`),
  UNIQUE KEY `newsletters_uuid_unique` (`uuid`),
  UNIQUE KEY `newsletters_name_unique` (`name`),
  UNIQUE KEY `newsletters_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `newsletters`
--

LOCK TABLES `newsletters` WRITE;
/*!40000 ALTER TABLE `newsletters` DISABLE KEYS */;
INSERT INTO `newsletters` VALUES ('68ae38c239f9d451fc9550bb','33cbd63f-a4f8-49c8-b92b-4b052ea27983','Test Blog',NULL,0,'default-newsletter',NULL,NULL,'newsletter','active','members',1,0,NULL,1,1,0,'sans_serif','center',1,'sans_serif',NULL,1,1,1,1,0,0,'light',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:20','rounded','fill','bold','underline','square','transparent',NULL,NULL,'accent','accent');
/*!40000 ALTER TABLE `newsletters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offer_redemptions`
--

DROP TABLE IF EXISTS `offer_redemptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offer_redemptions` (
  `id` varchar(24) NOT NULL,
  `offer_id` varchar(24) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `subscription_id` varchar(24) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `offer_redemptions_offer_id_foreign` (`offer_id`),
  KEY `offer_redemptions_member_id_foreign` (`member_id`),
  KEY `offer_redemptions_subscription_id_foreign` (`subscription_id`),
  CONSTRAINT `offer_redemptions_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_redemptions_offer_id_foreign` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `offer_redemptions_subscription_id_foreign` FOREIGN KEY (`subscription_id`) REFERENCES `members_stripe_customers_subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offer_redemptions`
--

LOCK TABLES `offer_redemptions` WRITE;
/*!40000 ALTER TABLE `offer_redemptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `offer_redemptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offers`
--

DROP TABLE IF EXISTS `offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offers` (
  `id` varchar(24) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `product_id` varchar(24) NOT NULL,
  `stripe_coupon_id` varchar(255) DEFAULT NULL,
  `interval` varchar(50) NOT NULL,
  `currency` varchar(50) DEFAULT NULL,
  `discount_type` varchar(50) NOT NULL,
  `discount_amount` int NOT NULL,
  `duration` varchar(50) NOT NULL,
  `duration_in_months` int DEFAULT NULL,
  `portal_title` varchar(191) DEFAULT NULL,
  `portal_description` varchar(2000) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `offers_name_unique` (`name`),
  UNIQUE KEY `offers_code_unique` (`code`),
  UNIQUE KEY `offers_stripe_coupon_id_unique` (`stripe_coupon_id`),
  KEY `offers_product_id_foreign` (`product_id`),
  CONSTRAINT `offers_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offers`
--

LOCK TABLES `offers` WRITE;
/*!40000 ALTER TABLE `offers` DISABLE KEYS */;
/*!40000 ALTER TABLE `offers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` varchar(24) NOT NULL,
  `name` varchar(50) NOT NULL,
  `object_type` varchar(50) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `object_id` varchar(24) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES ('68ae38c239f9d451fc9550bc','Read explore data','explore','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550bd','Export database','db','exportContent',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550be','Import database','db','importContent',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550bf','Delete all content','db','deleteAllContent',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550c0','Send mail','mail','send',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550c1','Browse notifications','notification','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550c2','Read newsletters','newsletter','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550c3','Add notifications','notification','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550c4','Delete notifications','notification','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550c5','Browse posts','post','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550c6','Read posts','post','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550c7','Edit posts','post','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550c8','Add posts','post','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550c9','Delete posts','post','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550ca','Browse settings','setting','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550cb','Read settings','setting','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550cc','Edit settings','setting','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550cd','Generate slugs','slug','generate',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550ce','Browse tags','tag','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550cf','Read tags','tag','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550d0','Edit tags','tag','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550d1','Add tags','tag','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550d2','Delete tags','tag','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550d3','Browse themes','theme','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550d4','Edit themes','theme','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550d5','Activate themes','theme','activate',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550d6','View active theme details','theme','readActive',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550d7','Upload themes','theme','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550d8','Download themes','theme','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550d9','Delete themes','theme','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550da','Browse users','user','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550db','Read users','user','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550dc','Edit users','user','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550dd','Add users','user','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550de','Delete users','user','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550df','Assign a role','role','assign',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550e0','Browse roles','role','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550e1','Browse invites','invite','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550e2','Read invites','invite','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550e3','Edit invites','invite','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550e4','Add invites','invite','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550e5','Delete invites','invite','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550e6','Download redirects','redirect','download',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550e7','Upload redirects','redirect','upload',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550e8','Add webhooks','webhook','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550e9','Edit webhooks','webhook','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550ea','Delete webhooks','webhook','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550eb','Browse integrations','integration','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550ec','Read integrations','integration','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550ed','Edit integrations','integration','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550ee','Add integrations','integration','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550ef','Delete integrations','integration','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550f0','Browse API keys','api_key','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550f1','Read API keys','api_key','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550f2','Edit API keys','api_key','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550f3','Add API keys','api_key','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550f4','Delete API keys','api_key','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550f5','Browse Actions','action','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550f6','Browse Members','member','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550f7','Read Members','member','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550f8','Edit Members','member','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550f9','Add Members','member','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550fa','Delete Members','member','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550fb','Browse Products','product','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550fc','Read Products','product','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550fd','Edit Products','product','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550fe','Add Products','product','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9550ff','Delete Products','product','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955100','Publish posts','post','publish',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955101','Backup database','db','backupContent',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955102','Email preview','email_preview','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955103','Send test email','email_preview','sendTestEmail',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955104','Browse emails','email','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955105','Read emails','email','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955106','Retry emails','email','retry',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955107','Browse labels','label','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955108','Read labels','label','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955109','Edit labels','label','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95510a','Add labels','label','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95510b','Delete labels','label','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95510c','Read member signin urls','member_signin_url','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95510d','Read identities','identity','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95510e','Auth Stripe Connect for Members','members_stripe_connect','auth',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95510f','Browse snippets','snippet','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955110','Read snippets','snippet','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955111','Edit snippets','snippet','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955112','Add snippets','snippet','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955113','Delete snippets','snippet','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955114','Browse offers','offer','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955115','Read offers','offer','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955116','Edit offers','offer','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955117','Add offers','offer','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955118','Reset all passwords','authentication','resetAllPasswords',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955119','Browse custom theme settings','custom_theme_setting','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95511a','Edit custom theme settings','custom_theme_setting','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95511b','Browse newsletters','newsletter','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95511c','Add newsletters','newsletter','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95511d','Edit newsletters','newsletter','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95511e','Browse comments','comment','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95511f','Read comments','comment','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955120','Edit comments','comment','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955121','Add comments','comment','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955122','Delete comments','comment','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955123','Moderate comments','comment','moderate',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955124','Like comments','comment','like',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955125','Unlike comments','comment','unlike',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955126','Report comments','comment','report',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955127','Browse links','link','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955128','Edit links','link','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955129','Browse mentions','mention','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95512a','Browse collections','collection','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95512b','Read collections','collection','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95512c','Edit collections','collection','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95512d','Add collections','collection','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95512e','Delete collections','collection','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95512f','Browse recommendations','recommendation','browse',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955130','Read recommendations','recommendation','read',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955131','Edit recommendations','recommendation','edit',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955132','Add recommendations','recommendation','add',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955133','Delete recommendations','recommendation','destroy',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions_roles`
--

DROP TABLE IF EXISTS `permissions_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions_roles` (
  `id` varchar(24) NOT NULL,
  `role_id` varchar(24) NOT NULL,
  `permission_id` varchar(24) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions_roles`
--

LOCK TABLES `permissions_roles` WRITE;
/*!40000 ALTER TABLE `permissions_roles` DISABLE KEYS */;
INSERT INTO `permissions_roles` VALUES ('68ae38c239f9d451fc95514b','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550bd'),('68ae38c239f9d451fc95514c','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550be'),('68ae38c239f9d451fc95514d','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550bf'),('68ae38c239f9d451fc95514e','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955101'),('68ae38c239f9d451fc95514f','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550c0'),('68ae38c239f9d451fc955150','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550c1'),('68ae38c239f9d451fc955151','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550c3'),('68ae38c239f9d451fc955152','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550c4'),('68ae38c239f9d451fc955153','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550c5'),('68ae38c239f9d451fc955154','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550c6'),('68ae38c239f9d451fc955155','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550c7'),('68ae38c239f9d451fc955156','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550c8'),('68ae38c239f9d451fc955157','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550c9'),('68ae38c239f9d451fc955158','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955100'),('68ae38c239f9d451fc955159','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550ca'),('68ae38c239f9d451fc95515a','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550cb'),('68ae38c239f9d451fc95515b','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550cc'),('68ae38c239f9d451fc95515c','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550cd'),('68ae38c239f9d451fc95515d','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550ce'),('68ae38c239f9d451fc95515e','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550cf'),('68ae38c239f9d451fc95515f','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550d0'),('68ae38c239f9d451fc955160','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550d1'),('68ae38c239f9d451fc955161','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550d2'),('68ae38c239f9d451fc955162','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550d3'),('68ae38c239f9d451fc955163','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550d4'),('68ae38c239f9d451fc955164','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550d5'),('68ae38c239f9d451fc955165','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550d6'),('68ae38c239f9d451fc955166','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550d7'),('68ae38c239f9d451fc955167','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550d8'),('68ae38c239f9d451fc955168','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550d9'),('68ae38c239f9d451fc955169','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550da'),('68ae38c239f9d451fc95516a','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550db'),('68ae38c239f9d451fc95516b','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550dc'),('68ae38c239f9d451fc95516c','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550dd'),('68ae38c239f9d451fc95516d','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550de'),('68ae38c239f9d451fc95516e','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550df'),('68ae38c239f9d451fc95516f','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550e0'),('68ae38c239f9d451fc955170','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550e1'),('68ae38c239f9d451fc955171','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550e2'),('68ae38c239f9d451fc955172','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550e3'),('68ae38c239f9d451fc955173','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550e4'),('68ae38c239f9d451fc955174','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550e5'),('68ae38c239f9d451fc955175','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550e6'),('68ae38c239f9d451fc955176','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550e7'),('68ae38c239f9d451fc955177','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550e8'),('68ae38c239f9d451fc955178','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550e9'),('68ae38c239f9d451fc955179','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550ea'),('68ae38c239f9d451fc95517a','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550eb'),('68ae38c239f9d451fc95517b','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550ec'),('68ae38c239f9d451fc95517c','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550ed'),('68ae38c239f9d451fc95517d','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550ee'),('68ae38c239f9d451fc95517e','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550ef'),('68ae38c239f9d451fc95517f','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550f0'),('68ae38c239f9d451fc955180','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550f1'),('68ae38c239f9d451fc955181','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550f2'),('68ae38c239f9d451fc955182','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550f3'),('68ae38c239f9d451fc955183','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550f4'),('68ae38c239f9d451fc955184','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550f5'),('68ae38c239f9d451fc955185','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550f6'),('68ae38c239f9d451fc955186','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550f7'),('68ae38c239f9d451fc955187','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550f8'),('68ae38c239f9d451fc955188','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550f9'),('68ae38c239f9d451fc955189','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550fa'),('68ae38c239f9d451fc95518a','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550fb'),('68ae38c239f9d451fc95518b','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550fc'),('68ae38c239f9d451fc95518c','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550fd'),('68ae38c239f9d451fc95518d','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550fe'),('68ae38c239f9d451fc95518e','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550ff'),('68ae38c239f9d451fc95518f','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955107'),('68ae38c239f9d451fc955190','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955108'),('68ae38c239f9d451fc955191','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955109'),('68ae38c239f9d451fc955192','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95510a'),('68ae38c239f9d451fc955193','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95510b'),('68ae38c239f9d451fc955194','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955102'),('68ae38c239f9d451fc955195','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955103'),('68ae38c239f9d451fc955196','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955104'),('68ae38c239f9d451fc955197','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955105'),('68ae38c239f9d451fc955198','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955106'),('68ae38c239f9d451fc955199','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95510c'),('68ae38c239f9d451fc95519a','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95510f'),('68ae38c239f9d451fc95519b','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955110'),('68ae38c239f9d451fc95519c','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955111'),('68ae38c239f9d451fc95519d','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955112'),('68ae38c239f9d451fc95519e','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955113'),('68ae38c239f9d451fc95519f','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955119'),('68ae38c239f9d451fc9551a0','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95511a'),('68ae38c239f9d451fc9551a1','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955114'),('68ae38c239f9d451fc9551a2','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955115'),('68ae38c239f9d451fc9551a3','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955116'),('68ae38c239f9d451fc9551a4','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955117'),('68ae38c239f9d451fc9551a5','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955118'),('68ae38c239f9d451fc9551a6','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95510e'),('68ae38c239f9d451fc9551a7','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550c2'),('68ae38c239f9d451fc9551a8','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95511b'),('68ae38c239f9d451fc9551a9','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95511c'),('68ae38c239f9d451fc9551aa','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95511d'),('68ae38c239f9d451fc9551ab','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc9550bc'),('68ae38c239f9d451fc9551ac','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95511e'),('68ae38c239f9d451fc9551ad','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95511f'),('68ae38c239f9d451fc9551ae','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955120'),('68ae38c239f9d451fc9551af','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955121'),('68ae38c239f9d451fc9551b0','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955122'),('68ae38c239f9d451fc9551b1','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955123'),('68ae38c239f9d451fc9551b2','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955124'),('68ae38c239f9d451fc9551b3','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955125'),('68ae38c239f9d451fc9551b4','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955126'),('68ae38c239f9d451fc9551b5','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955127'),('68ae38c239f9d451fc9551b6','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955128'),('68ae38c239f9d451fc9551b7','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955129'),('68ae38c239f9d451fc9551b8','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95512a'),('68ae38c239f9d451fc9551b9','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95512b'),('68ae38c239f9d451fc9551ba','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95512c'),('68ae38c239f9d451fc9551bb','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95512d'),('68ae38c239f9d451fc9551bc','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95512e'),('68ae38c239f9d451fc9551bd','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95512f'),('68ae38c239f9d451fc9551be','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955130'),('68ae38c239f9d451fc9551bf','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955131'),('68ae38c239f9d451fc9551c0','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955132'),('68ae38c239f9d451fc9551c1','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc955133'),('68ae38c239f9d451fc9551c2','68ae38c139f9d451fc9550aa','68ae38c239f9d451fc95510d'),('68ae38c239f9d451fc9551c3','68ae38c139f9d451fc9550b2','68ae38c239f9d451fc9550bd'),('68ae38c239f9d451fc9551c4','68ae38c139f9d451fc9550b2','68ae38c239f9d451fc9550be'),('68ae38c239f9d451fc9551c5','68ae38c139f9d451fc9550b2','68ae38c239f9d451fc9550bf'),('68ae38c239f9d451fc9551c6','68ae38c139f9d451fc9550b2','68ae38c239f9d451fc955101'),('68ae38c239f9d451fc9551c7','68ae38c139f9d451fc9550b2','68ae38c239f9d451fc9550f6'),('68ae38c239f9d451fc9551c8','68ae38c139f9d451fc9550b3','68ae38c239f9d451fc955100'),('68ae38c239f9d451fc9551c9','68ae38c139f9d451fc9550b0','68ae38c239f9d451fc9550bc'),('68ae38c239f9d451fc9551ca','68ae38c139f9d451fc9550b1','68ae38c239f9d451fc9550be'),('68ae38c239f9d451fc9551cb','68ae38c139f9d451fc9550b1','68ae38c239f9d451fc9550f9'),('68ae38c239f9d451fc9551cc','68ae38c139f9d451fc9550b1','68ae38c239f9d451fc9550cf'),('68ae38c239f9d451fc9551cd','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550c0'),('68ae38c239f9d451fc9551ce','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550c1'),('68ae38c239f9d451fc9551cf','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550c3'),('68ae38c239f9d451fc9551d0','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550c4'),('68ae38c239f9d451fc9551d1','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550c5'),('68ae38c239f9d451fc9551d2','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550c6'),('68ae38c239f9d451fc9551d3','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550c7'),('68ae38c239f9d451fc9551d4','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550c8'),('68ae38c239f9d451fc9551d5','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550c9'),('68ae38c239f9d451fc9551d6','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955100'),('68ae38c239f9d451fc9551d7','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550ca'),('68ae38c239f9d451fc9551d8','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550cb'),('68ae38c239f9d451fc9551d9','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550cc'),('68ae38c239f9d451fc9551da','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550cd'),('68ae38c239f9d451fc9551db','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550ce'),('68ae38c239f9d451fc9551dc','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550cf'),('68ae38c239f9d451fc9551dd','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550d0'),('68ae38c239f9d451fc9551de','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550d1'),('68ae38c239f9d451fc9551df','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550d2'),('68ae38c239f9d451fc9551e0','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550d3'),('68ae38c239f9d451fc9551e1','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550d4'),('68ae38c239f9d451fc9551e2','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550d5'),('68ae38c239f9d451fc9551e3','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550d6'),('68ae38c239f9d451fc9551e4','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550d7'),('68ae38c239f9d451fc9551e5','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550d8'),('68ae38c239f9d451fc9551e6','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550d9'),('68ae38c239f9d451fc9551e7','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550da'),('68ae38c239f9d451fc9551e8','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550db'),('68ae38c239f9d451fc9551e9','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550dc'),('68ae38c239f9d451fc9551ea','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550dd'),('68ae38c239f9d451fc9551eb','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550de'),('68ae38c239f9d451fc9551ec','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550df'),('68ae38c239f9d451fc9551ed','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550e0'),('68ae38c239f9d451fc9551ee','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550e1'),('68ae38c239f9d451fc9551ef','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550e2'),('68ae38c239f9d451fc9551f0','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550e3'),('68ae38c239f9d451fc9551f1','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550e4'),('68ae38c239f9d451fc9551f2','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550e5'),('68ae38c239f9d451fc9551f3','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550e6'),('68ae38c239f9d451fc9551f4','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550e7'),('68ae38c239f9d451fc9551f5','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550e8'),('68ae38c239f9d451fc9551f6','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550e9'),('68ae38c239f9d451fc9551f7','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550ea'),('68ae38c239f9d451fc9551f8','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550f5'),('68ae38c239f9d451fc9551f9','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550f6'),('68ae38c239f9d451fc9551fa','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550f7'),('68ae38c239f9d451fc9551fb','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550f8'),('68ae38c239f9d451fc9551fc','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550f9'),('68ae38c239f9d451fc9551fd','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550fa'),('68ae38c239f9d451fc9551fe','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95510c'),('68ae38c239f9d451fc9551ff','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955107'),('68ae38c239f9d451fc955200','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955108'),('68ae38c239f9d451fc955201','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955109'),('68ae38c239f9d451fc955202','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95510a'),('68ae38c239f9d451fc955203','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95510b'),('68ae38c239f9d451fc955204','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955102'),('68ae38c239f9d451fc955205','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955103'),('68ae38c239f9d451fc955206','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955104'),('68ae38c239f9d451fc955207','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955105'),('68ae38c239f9d451fc955208','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955106'),('68ae38c239f9d451fc955209','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95510f'),('68ae38c239f9d451fc95520a','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955110'),('68ae38c239f9d451fc95520b','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955111'),('68ae38c239f9d451fc95520c','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955112'),('68ae38c239f9d451fc95520d','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955113'),('68ae38c239f9d451fc95520e','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550fb'),('68ae38c239f9d451fc95520f','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550fc'),('68ae38c239f9d451fc955210','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550fd'),('68ae38c239f9d451fc955211','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550fe'),('68ae38c239f9d451fc955212','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955114'),('68ae38c239f9d451fc955213','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955115'),('68ae38c239f9d451fc955214','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955116'),('68ae38c239f9d451fc955215','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955117'),('68ae38c239f9d451fc955216','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550c2'),('68ae38c239f9d451fc955217','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95511b'),('68ae38c239f9d451fc955218','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95511c'),('68ae38c239f9d451fc955219','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95511d'),('68ae38c239f9d451fc95521a','68ae38c139f9d451fc9550af','68ae38c239f9d451fc9550bc'),('68ae38c239f9d451fc95521b','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95511e'),('68ae38c239f9d451fc95521c','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95511f'),('68ae38c239f9d451fc95521d','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955120'),('68ae38c239f9d451fc95521e','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955121'),('68ae38c239f9d451fc95521f','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955122'),('68ae38c239f9d451fc955220','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955123'),('68ae38c239f9d451fc955221','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955124'),('68ae38c239f9d451fc955222','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955125'),('68ae38c239f9d451fc955223','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955126'),('68ae38c239f9d451fc955224','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955127'),('68ae38c239f9d451fc955225','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955128'),('68ae38c239f9d451fc955226','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955129'),('68ae38c239f9d451fc955227','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95512a'),('68ae38c239f9d451fc955228','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95512b'),('68ae38c239f9d451fc955229','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95512c'),('68ae38c239f9d451fc95522a','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95512d'),('68ae38c239f9d451fc95522b','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95512e'),('68ae38c239f9d451fc95522c','68ae38c139f9d451fc9550af','68ae38c239f9d451fc95512f'),('68ae38c239f9d451fc95522d','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955130'),('68ae38c239f9d451fc95522e','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955131'),('68ae38c239f9d451fc95522f','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955132'),('68ae38c239f9d451fc955230','68ae38c139f9d451fc9550af','68ae38c239f9d451fc955133'),('68ae38c239f9d451fc955231','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550c1'),('68ae38c239f9d451fc955232','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550c3'),('68ae38c239f9d451fc955233','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550c4'),('68ae38c239f9d451fc955234','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550c5'),('68ae38c239f9d451fc955235','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550c6'),('68ae38c239f9d451fc955236','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550c7'),('68ae38c239f9d451fc955237','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550c8'),('68ae38c239f9d451fc955238','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550c9'),('68ae38c239f9d451fc955239','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955100'),('68ae38c239f9d451fc95523a','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550ca'),('68ae38c239f9d451fc95523b','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550cb'),('68ae38c239f9d451fc95523c','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550cd'),('68ae38c239f9d451fc95523d','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550ce'),('68ae38c239f9d451fc95523e','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550cf'),('68ae38c239f9d451fc95523f','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550d0'),('68ae38c239f9d451fc955240','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550d1'),('68ae38c239f9d451fc955241','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550d2'),('68ae38c239f9d451fc955242','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550da'),('68ae38c239f9d451fc955243','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550db'),('68ae38c239f9d451fc955244','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550dc'),('68ae38c239f9d451fc955245','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550dd'),('68ae38c239f9d451fc955246','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550de'),('68ae38c239f9d451fc955247','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550df'),('68ae38c239f9d451fc955248','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550e0'),('68ae38c239f9d451fc955249','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550e1'),('68ae38c239f9d451fc95524a','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550e2'),('68ae38c239f9d451fc95524b','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550e3'),('68ae38c239f9d451fc95524c','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550e4'),('68ae38c239f9d451fc95524d','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550e5'),('68ae38c239f9d451fc95524e','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550d3'),('68ae38c239f9d451fc95524f','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550d6'),('68ae38c239f9d451fc955250','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955102'),('68ae38c239f9d451fc955251','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955103'),('68ae38c239f9d451fc955252','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955104'),('68ae38c239f9d451fc955253','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955105'),('68ae38c239f9d451fc955254','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955106'),('68ae38c239f9d451fc955255','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc95510f'),('68ae38c239f9d451fc955256','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955110'),('68ae38c239f9d451fc955257','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955111'),('68ae38c239f9d451fc955258','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955112'),('68ae38c239f9d451fc955259','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955113'),('68ae38c239f9d451fc95525a','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955107'),('68ae38c239f9d451fc95525b','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955108'),('68ae38c239f9d451fc95525c','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550fb'),('68ae38c239f9d451fc95525d','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550fc'),('68ae38c239f9d451fc95525e','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc9550c2'),('68ae38c239f9d451fc95525f','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc95511b'),('68ae38c239f9d451fc955260','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc95512a'),('68ae38c239f9d451fc955261','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc95512b'),('68ae38c239f9d451fc955262','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc95512c'),('68ae38c239f9d451fc955263','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc95512d'),('68ae38c239f9d451fc955264','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc95512e'),('68ae38c239f9d451fc955265','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc95512f'),('68ae38c239f9d451fc955266','68ae38c139f9d451fc9550ab','68ae38c239f9d451fc955130'),('68ae38c239f9d451fc955267','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550c5'),('68ae38c239f9d451fc955268','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550c6'),('68ae38c239f9d451fc955269','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550c7'),('68ae38c239f9d451fc95526a','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550c8'),('68ae38c239f9d451fc95526b','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550c9'),('68ae38c239f9d451fc95526c','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550ca'),('68ae38c239f9d451fc95526d','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550cb'),('68ae38c239f9d451fc95526e','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550cd'),('68ae38c239f9d451fc95526f','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550ce'),('68ae38c239f9d451fc955270','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550cf'),('68ae38c239f9d451fc955271','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550d1'),('68ae38c239f9d451fc955272','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550da'),('68ae38c239f9d451fc955273','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550db'),('68ae38c239f9d451fc955274','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550e0'),('68ae38c239f9d451fc955275','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550d3'),('68ae38c239f9d451fc955276','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550d6'),('68ae38c239f9d451fc955277','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc955102'),('68ae38c239f9d451fc955278','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc955105'),('68ae38c239f9d451fc955279','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc95510f'),('68ae38c239f9d451fc95527a','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc955110'),('68ae38c239f9d451fc95527b','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc955107'),('68ae38c239f9d451fc95527c','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc955108'),('68ae38c239f9d451fc95527d','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550fb'),('68ae38c239f9d451fc95527e','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550fc'),('68ae38c239f9d451fc95527f','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc9550c2'),('68ae38c239f9d451fc955280','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc95511b'),('68ae38c239f9d451fc955281','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc95512a'),('68ae38c239f9d451fc955282','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc95512b'),('68ae38c239f9d451fc955283','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc95512d'),('68ae38c239f9d451fc955284','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc95512f'),('68ae38c239f9d451fc955285','68ae38c139f9d451fc9550ac','68ae38c239f9d451fc955130'),('68ae38c239f9d451fc955286','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550c1'),('68ae38c239f9d451fc955287','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550c3'),('68ae38c239f9d451fc955288','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550c4'),('68ae38c239f9d451fc955289','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550c5'),('68ae38c239f9d451fc95528a','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550c6'),('68ae38c239f9d451fc95528b','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550c7'),('68ae38c239f9d451fc95528c','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550c8'),('68ae38c239f9d451fc95528d','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550c9'),('68ae38c239f9d451fc95528e','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955100'),('68ae38c239f9d451fc95528f','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550ca'),('68ae38c239f9d451fc955290','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550cb'),('68ae38c239f9d451fc955291','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550cd'),('68ae38c239f9d451fc955292','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550ce'),('68ae38c239f9d451fc955293','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550cf'),('68ae38c239f9d451fc955294','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550d0'),('68ae38c239f9d451fc955295','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550d1'),('68ae38c239f9d451fc955296','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550d2'),('68ae38c239f9d451fc955297','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550da'),('68ae38c239f9d451fc955298','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550db'),('68ae38c239f9d451fc955299','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550dc'),('68ae38c239f9d451fc95529a','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550dd'),('68ae38c239f9d451fc95529b','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550de'),('68ae38c239f9d451fc95529c','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550df'),('68ae38c239f9d451fc95529d','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550e0'),('68ae38c239f9d451fc95529e','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550e1'),('68ae38c239f9d451fc95529f','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550e2'),('68ae38c239f9d451fc9552a0','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550e3'),('68ae38c239f9d451fc9552a1','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550e4'),('68ae38c239f9d451fc9552a2','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550e5'),('68ae38c239f9d451fc9552a3','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550d3'),('68ae38c239f9d451fc9552a4','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550d6'),('68ae38c239f9d451fc9552a5','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955102'),('68ae38c239f9d451fc9552a6','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955103'),('68ae38c239f9d451fc9552a7','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955104'),('68ae38c239f9d451fc9552a8','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955105'),('68ae38c239f9d451fc9552a9','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955106'),('68ae38c239f9d451fc9552aa','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95510f'),('68ae38c239f9d451fc9552ab','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955110'),('68ae38c239f9d451fc9552ac','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955111'),('68ae38c239f9d451fc9552ad','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955112'),('68ae38c239f9d451fc9552ae','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955113'),('68ae38c239f9d451fc9552af','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955107'),('68ae38c239f9d451fc9552b0','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955108'),('68ae38c239f9d451fc9552b1','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955109'),('68ae38c239f9d451fc9552b2','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95510a'),('68ae38c239f9d451fc9552b3','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95510b'),('68ae38c239f9d451fc9552b4','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550fb'),('68ae38c239f9d451fc9552b5','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550fc'),('68ae38c239f9d451fc9552b6','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550c2'),('68ae38c239f9d451fc9552b7','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95511b'),('68ae38c239f9d451fc9552b8','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95512a'),('68ae38c239f9d451fc9552b9','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95512b'),('68ae38c239f9d451fc9552ba','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95512c'),('68ae38c239f9d451fc9552bb','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95512d'),('68ae38c239f9d451fc9552bc','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95512e'),('68ae38c239f9d451fc9552bd','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95512f'),('68ae38c239f9d451fc9552be','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955130'),('68ae38c239f9d451fc9552bf','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550f6'),('68ae38c239f9d451fc9552c0','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550f7'),('68ae38c239f9d451fc9552c1','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550f8'),('68ae38c239f9d451fc9552c2','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550f9'),('68ae38c239f9d451fc9552c3','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc9550fa'),('68ae38c239f9d451fc9552c4','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95510c'),('68ae38c239f9d451fc9552c5','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955114'),('68ae38c239f9d451fc9552c6','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955115'),('68ae38c239f9d451fc9552c7','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95511e'),('68ae38c239f9d451fc9552c8','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc95511f'),('68ae38c239f9d451fc9552c9','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955120'),('68ae38c239f9d451fc9552ca','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955121'),('68ae38c239f9d451fc9552cb','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955122'),('68ae38c239f9d451fc9552cc','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955123'),('68ae38c239f9d451fc9552cd','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955124'),('68ae38c239f9d451fc9552ce','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955125'),('68ae38c239f9d451fc9552cf','68ae38c139f9d451fc9550b4','68ae38c239f9d451fc955126'),('68ae38c239f9d451fc9552d0','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550c5'),('68ae38c239f9d451fc9552d1','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550c6'),('68ae38c239f9d451fc9552d2','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550c7'),('68ae38c239f9d451fc9552d3','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550c8'),('68ae38c239f9d451fc9552d4','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550c9'),('68ae38c239f9d451fc9552d5','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550ca'),('68ae38c239f9d451fc9552d6','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550cb'),('68ae38c239f9d451fc9552d7','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550cd'),('68ae38c239f9d451fc9552d8','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550ce'),('68ae38c239f9d451fc9552d9','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550cf'),('68ae38c239f9d451fc9552da','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550da'),('68ae38c239f9d451fc9552db','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550db'),('68ae38c239f9d451fc9552dc','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550e0'),('68ae38c239f9d451fc9552dd','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc9550d3'),('68ae38c239f9d451fc9552de','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc955102'),('68ae38c239f9d451fc9552df','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc955105'),('68ae38c239f9d451fc9552e0','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc95510f'),('68ae38c239f9d451fc9552e1','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc955110'),('68ae38c239f9d451fc9552e2','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc95512a'),('68ae38c239f9d451fc9552e3','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc95512b'),('68ae38c239f9d451fc9552e4','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc95512f'),('68ae38c239f9d451fc9552e5','68ae38c139f9d451fc9550ad','68ae38c239f9d451fc955130');
/*!40000 ALTER TABLE `permissions_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions_users`
--

DROP TABLE IF EXISTS `permissions_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions_users` (
  `id` varchar(24) NOT NULL,
  `user_id` varchar(24) NOT NULL,
  `permission_id` varchar(24) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions_users`
--

LOCK TABLES `permissions_users` WRITE;
/*!40000 ALTER TABLE `permissions_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `permissions_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `post_revisions`
--

DROP TABLE IF EXISTS `post_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_revisions` (
  `id` varchar(24) NOT NULL,
  `post_id` varchar(24) NOT NULL,
  `lexical` longtext,
  `created_at_ts` bigint NOT NULL,
  `created_at` datetime NOT NULL,
  `author_id` varchar(24) DEFAULT NULL,
  `title` varchar(2000) DEFAULT NULL,
  `post_status` varchar(50) DEFAULT NULL,
  `reason` varchar(50) DEFAULT NULL,
  `feature_image` varchar(2000) DEFAULT NULL,
  `feature_image_alt` varchar(2000) DEFAULT NULL,
  `feature_image_caption` text,
  `custom_excerpt` varchar(2000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `post_revisions_post_id_index` (`post_id`),
  KEY `post_revs_author_id_foreign` (`author_id`),
  CONSTRAINT `post_revs_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `post_revisions`
--

LOCK TABLES `post_revisions` WRITE;
/*!40000 ALTER TABLE `post_revisions` DISABLE KEYS */;
/*!40000 ALTER TABLE `post_revisions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts` (
  `id` varchar(24) NOT NULL,
  `uuid` varchar(36) NOT NULL,
  `title` varchar(2000) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `mobiledoc` longtext,
  `lexical` longtext,
  `html` longtext,
  `comment_id` varchar(50) DEFAULT NULL,
  `plaintext` longtext,
  `feature_image` varchar(2000) DEFAULT NULL,
  `featured` tinyint(1) NOT NULL DEFAULT '0',
  `type` varchar(50) NOT NULL DEFAULT 'post',
  `status` varchar(50) NOT NULL DEFAULT 'draft',
  `locale` varchar(6) DEFAULT NULL,
  `visibility` varchar(50) NOT NULL DEFAULT 'public',
  `email_recipient_filter` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `published_by` varchar(24) DEFAULT NULL,
  `custom_excerpt` varchar(2000) DEFAULT NULL,
  `codeinjection_head` text,
  `codeinjection_foot` text,
  `custom_template` varchar(100) DEFAULT NULL,
  `canonical_url` text,
  `newsletter_id` varchar(24) DEFAULT NULL,
  `show_title_and_feature_image` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `posts_slug_type_unique` (`slug`,`type`),
  KEY `posts_uuid_index` (`uuid`),
  KEY `posts_updated_at_index` (`updated_at`),
  KEY `posts_published_at_index` (`published_at`),
  KEY `posts_newsletter_id_foreign` (`newsletter_id`),
  KEY `posts_type_status_updated_at_index` (`type`,`status`,`updated_at`),
  CONSTRAINT `posts_newsletter_id_foreign` FOREIGN KEY (`newsletter_id`) REFERENCES `newsletters` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posts`
--

LOCK TABLES `posts` WRITE;
/*!40000 ALTER TABLE `posts` DISABLE KEYS */;
INSERT INTO `posts` VALUES ('6194d3ce51e2700162531a71','b21746b0-d7a8-4671-bb6e-22de73a827e2','Setting up apps and custom integrations','integrations','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/integrations-icons.png\",\"cardWidth\":\"full\"}],[\"markdown\",{\"markdown\":\"<script src=\\\"https://zapier.com/apps/embed/widget.js?services=Ghost,-shortcm,-hubspot,-sendpulse,-noticeable,-aweber,-icontact,-facebook-pages,-github,-medium,-slack,-mailchimp,-activecampaign,-twitter,-discourse&container,-convertkit,-drip,-airtable=true&limit=5\\\"></script>\\n\"}],[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/iawriter-integration.png\",\"width\":2244,\"height\":936}]],\"markups\":[[\"a\",[\"href\",\"https://ghost.org/integrations/\"]],[\"strong\"]],\"sections\":[[1,\"p\",[[0,[],0,\"It\'s possible to extend your Ghost site and connect it with hundreds of the most popular apps and tools using integrations. \"]]],[1,\"p\",[[0,[],0,\"Whether you need to automatically publish new posts on social media, connect your favorite analytics tool, sync your community or embed forms into your content — our \"],[0,[0],1,\"integrations library\"],[0,[],0,\" has got it all covered with hundreds of integration tutorials.\"]]],[1,\"p\",[[0,[],0,\"Many integrations are as simple as inserting an embed by pasting a link, or copying a snippet of code directly from an app and pasting it into Ghost. Our integration tutorials are used by creators of all kinds to get apps and integrations up and running in no time — no technical knowledge required.\"]]],[10,0],[1,\"h2\",[[0,[],0,\"Zapier\"]]],[1,\"p\",[[0,[],0,\"Zapier is a no-code tool that allows you to build powerful automations, and our official integration allows you to connect your Ghost site to more than 1,000 external services.\"]]],[1,\"blockquote\",[[0,[1],1,\"Example\"],[0,[],0,\": When someone new subscribes to a newsletter on a Ghost site (Trigger) then the contact information is automatically pushed into MailChimp (Action).\"]]],[1,\"p\",[[0,[1],1,\"Here\'s a few of the most popular automation templates:\"],[0,[],0,\" \"]]],[10,1],[1,\"h2\",[[0,[],0,\"Custom integrations\"]]],[1,\"p\",[[0,[],0,\"For more advanced automation, it\'s possible to create custom Ghost integrations with dedicated API keys from the Integrations page within Ghost Admin. \"]]],[10,2],[1,\"p\",[[0,[],0,\"These custom integrations allow you to use the Ghost API without needing to write code, and create powerful workflows such as sending content from your favorite desktop editor into Ghost as a new draft.\"]]]],\"ghostVersion\":\"4.0\"}',NULL,'<p>It\'s possible to extend your Ghost site and connect it with hundreds of the most popular apps and tools using integrations. </p><p>Whether you need to automatically publish new posts on social media, connect your favorite analytics tool, sync your community or embed forms into your content — our <a href=\"https://ghost.org/integrations/\">integrations library</a> has got it all covered with hundreds of integration tutorials.</p><p>Many integrations are as simple as inserting an embed by pasting a link, or copying a snippet of code directly from an app and pasting it into Ghost. Our integration tutorials are used by creators of all kinds to get apps and integrations up and running in no time — no technical knowledge required.</p><figure class=\"kg-card kg-image-card kg-width-full\"><img src=\"https://static.ghost.org/v4.0.0/images/integrations-icons.png\" class=\"kg-image\" alt loading=\"lazy\"></figure><h2 id=\"zapier\">Zapier</h2><p>Zapier is a no-code tool that allows you to build powerful automations, and our official integration allows you to connect your Ghost site to more than 1,000 external services.</p><blockquote><strong>Example</strong>: When someone new subscribes to a newsletter on a Ghost site (Trigger) then the contact information is automatically pushed into MailChimp (Action).</blockquote><p><strong>Here\'s a few of the most popular automation templates:</strong> </p><!--kg-card-begin: markdown--><script src=\"https://zapier.com/apps/embed/widget.js?services=Ghost,-shortcm,-hubspot,-sendpulse,-noticeable,-aweber,-icontact,-facebook-pages,-github,-medium,-slack,-mailchimp,-activecampaign,-twitter,-discourse&container,-convertkit,-drip,-airtable=true&limit=5\"></script>\n<!--kg-card-end: markdown--><h2 id=\"custom-integrations\">Custom integrations</h2><p>For more advanced automation, it\'s possible to create custom Ghost integrations with dedicated API keys from the Integrations page within Ghost Admin. </p><figure class=\"kg-card kg-image-card\"><img src=\"https://static.ghost.org/v4.0.0/images/iawriter-integration.png\" class=\"kg-image\" alt loading=\"lazy\" width=\"2244\" height=\"936\"></figure><p>These custom integrations allow you to use the Ghost API without needing to write code, and create powerful workflows such as sending content from your favorite desktop editor into Ghost as a new draft.</p>','6194d3ce51e2700162531a71','It\'s possible to extend your Ghost site and connect it with hundreds of the most popular apps and tools using integrations.\n\nWhether you need to automatically publish new posts on social media, connect your favorite analytics tool, sync your community or embed forms into your content — our integrations library has got it all covered with hundreds of integration tutorials.\n\nMany integrations are as simple as inserting an embed by pasting a link, or copying a snippet of code directly from an app and pasting it into Ghost. Our integration tutorials are used by creators of all kinds to get apps and integrations up and running in no time — no technical knowledge required.\n\n\nZapier\n\nZapier is a no-code tool that allows you to build powerful automations, and our official integration allows you to connect your Ghost site to more than 1,000 external services.\n\nExample: When someone new subscribes to a newsletter on a Ghost site (Trigger) then the contact information is automatically pushed into MailChimp (Action).\n\nHere\'s a few of the most popular automation templates:\n\n\n\nCustom integrations\n\nFor more advanced automation, it\'s possible to create custom Ghost integrations with dedicated API keys from the Integrations page within Ghost Admin.\n\nThese custom integrations allow you to use the Ghost API without needing to write code, and create powerful workflows such as sending content from your favorite desktop editor into Ghost as a new draft.','https://static.ghost.org/v4.0.0/images/app-integrations.png',0,'post','published',NULL,'public','all','2025-08-26 22:44:18','2025-08-26 22:44:18','2025-08-26 22:44:18','5951f5fc0000000000000000','Work with all your favorite apps and tools or create your own custom integrations using the Ghost API.',NULL,NULL,NULL,NULL,NULL,1),('6194d3ce51e2700162531a72','923521c4-e386-41f2-802b-496b005ef985','How to grow your business around an audience','grow','{\"version\":\"0.3.1\",\"atoms\":[[\"soft-return\",\"\",{}],[\"soft-return\",\"\",{}],[\"soft-return\",\"\",{}],[\"soft-return\",\"\",{}],[\"soft-return\",\"\",{}],[\"soft-return\",\"\",{}],[\"soft-return\",\"\",{}],[\"soft-return\",\"\",{}],[\"soft-return\",\"\",{}],[\"soft-return\",\"\",{}],[\"soft-return\",\"\",{}],[\"soft-return\",\"\",{}]],\"cards\":[[\"hr\",{}]],\"markups\":[[\"strong\"],[\"a\",[\"href\",\"https://ghost.org/pricing/\"]],[\"em\"],[\"a\",[\"href\",\"https://ghost.org/blog/how-to-create-a-newsletter/\"]],[\"a\",[\"href\",\"https://ghost.org/blog/membership-sites/\"]],[\"a\",[\"href\",\"https://newsletterguide.org/\"]],[\"a\",[\"href\",\"https://ghost.org/blog/find-your-niche-creator-economy/\"]],[\"a\",[\"href\",\"https://ghost.org/blog/newsletter-referral-programs/\"]]],\"sections\":[[1,\"p\",[[0,[],0,\"As you grow, you\'ll probably want to start inviting team members and collaborators to your site. Ghost has a number of different user roles for your team:\"]]],[1,\"p\",[[0,[0],1,\"Contributors\"],[1,[],0,0],[0,[],0,\"This is the base user level in Ghost. Contributors can create and edit their own draft posts, but they are unable to edit drafts of others or publish posts. Contributors are \"],[0,[0],1,\"untrusted\"],[0,[],0,\" users with the most basic access to your publication.\"]]],[1,\"p\",[[0,[0],1,\"Authors\"],[1,[],0,1],[0,[],0,\"Authors are the 2nd user level in Ghost. Authors can write, edit and publish their own posts. Authors are \"],[0,[0],1,\"trusted\"],[0,[],0,\" users. If you don\'t trust users to be allowed to publish their own posts, they should be set as Contributors.\"]]],[1,\"p\",[[0,[0],1,\"Editors\"],[1,[],0,2],[0,[],0,\"Editors are the 3rd user level in Ghost. Editors can do everything that an Author can do, but they can also edit and publish the posts of others - as well as their own. Editors can also invite new Contributors & Authors to the site.\"]]],[1,\"p\",[[0,[0],1,\"Administrators\"],[1,[],0,3],[0,[],0,\"The top user level in Ghost is Administrator. Again, administrators can do everything that Authors and Editors can do, but they can also edit all site settings and data, not just content. Additionally, administrators have full access to invite, manage or remove any other user of the site.\"],[1,[],0,4],[1,[],0,5],[0,[0],1,\"The Owner\"],[1,[],0,6],[0,[],0,\"There is only ever one owner of a Ghost site. The owner is a special user which has all the same permissions as an Administrator, but with two exceptions: The Owner can never be deleted. And in some circumstances the owner will have access to additional special settings if applicable. For example: billing details, if using \"],[0,[1,0],2,\"Ghost(Pro)\"],[0,[],0,\".\"]]],[1,\"blockquote\",[[0,[2],1,\"Ask all of your users to fill out their user profiles, including bio and social links. These will populate rich structured data for posts and generally create more opportunities for themes to fully populate their design.\"]]],[10,0],[1,\"p\",[[0,[],0,\"If you\'re looking for insights, tips and reference materials to expand your content business, here\'s 5 top resources to get you started:\"]]],[3,\"ul\",[[[0,[3,0],2,\"How to create a premium newsletter (+ some case studies)\"],[0,[0],1,\" \"],[0,[],0,\" \"],[1,[],0,7],[0,[],0,\"Learn how others run successful paid email newsletter products\"]],[[0,[0,4],2,\"The ultimate guide to membership websites for creators\"],[1,[],0,8],[0,[],0,\"Tips to help you build, launch and grow your new membership business\"]],[[0,[0,5],2,\"The Newsletter Guide\"],[1,[],0,9],[0,[],0,\"A 201 guide for taking your newsletters to the next level\"]],[[0,[6,0],2,\"The proven way to find your niche, explained\"],[1,[],0,10],[0,[],0,\"Find the overlap and find a monetizable niche that gets noticed\"]],[[0,[0,7],2,\"Should you launch a referral program? \"],[1,[],0,11],[0,[],0,\"Strategies for building a sustainable referral growth machine\"]]]]],\"ghostVersion\":\"4.0\"}',NULL,'<p>As you grow, you\'ll probably want to start inviting team members and collaborators to your site. Ghost has a number of different user roles for your team:</p><p><strong>Contributors</strong><br>This is the base user level in Ghost. Contributors can create and edit their own draft posts, but they are unable to edit drafts of others or publish posts. Contributors are <strong>untrusted</strong> users with the most basic access to your publication.</p><p><strong>Authors</strong><br>Authors are the 2nd user level in Ghost. Authors can write, edit and publish their own posts. Authors are <strong>trusted</strong> users. If you don\'t trust users to be allowed to publish their own posts, they should be set as Contributors.</p><p><strong>Editors</strong><br>Editors are the 3rd user level in Ghost. Editors can do everything that an Author can do, but they can also edit and publish the posts of others - as well as their own. Editors can also invite new Contributors &amp; Authors to the site.</p><p><strong>Administrators</strong><br>The top user level in Ghost is Administrator. Again, administrators can do everything that Authors and Editors can do, but they can also edit all site settings and data, not just content. Additionally, administrators have full access to invite, manage or remove any other user of the site.<br><br><strong>The Owner</strong><br>There is only ever one owner of a Ghost site. The owner is a special user which has all the same permissions as an Administrator, but with two exceptions: The Owner can never be deleted. And in some circumstances the owner will have access to additional special settings if applicable. For example: billing details, if using <a href=\"https://ghost.org/pricing/\"><strong>Ghost(Pro)</strong></a>.</p><blockquote><em>Ask all of your users to fill out their user profiles, including bio and social links. These will populate rich structured data for posts and generally create more opportunities for themes to fully populate their design.</em></blockquote><hr><p>If you\'re looking for insights, tips and reference materials to expand your content business, here\'s 5 top resources to get you started:</p><ul><li><a href=\"https://ghost.org/blog/how-to-create-a-newsletter/\"><strong>How to create a premium newsletter (+ some case studies)</strong></a><strong> </strong> <br>Learn how others run successful paid email newsletter products</li><li><strong><a href=\"https://ghost.org/blog/membership-sites/\">The ultimate guide to membership websites for creators</a></strong><br>Tips to help you build, launch and grow your new membership business</li><li><strong><a href=\"https://newsletterguide.org/\">The Newsletter Guide</a></strong><br>A 201 guide for taking your newsletters to the next level</li><li><a href=\"https://ghost.org/blog/find-your-niche-creator-economy/\"><strong>The proven way to find your niche, explained</strong></a><br>Find the overlap and find a monetizable niche that gets noticed</li><li><strong><a href=\"https://ghost.org/blog/newsletter-referral-programs/\">Should you launch a referral program? </a></strong><br>Strategies for building a sustainable referral growth machine</li></ul>','6194d3ce51e2700162531a72','As you grow, you\'ll probably want to start inviting team members and collaborators to your site. Ghost has a number of different user roles for your team:\n\nContributors\nThis is the base user level in Ghost. Contributors can create and edit their own draft posts, but they are unable to edit drafts of others or publish posts. Contributors are untrusted users with the most basic access to your publication.\n\nAuthors\nAuthors are the 2nd user level in Ghost. Authors can write, edit and publish their own posts. Authors are trusted users. If you don\'t trust users to be allowed to publish their own posts, they should be set as Contributors.\n\nEditors\nEditors are the 3rd user level in Ghost. Editors can do everything that an Author can do, but they can also edit and publish the posts of others - as well as their own. Editors can also invite new Contributors & Authors to the site.\n\nAdministrators\nThe top user level in Ghost is Administrator. Again, administrators can do everything that Authors and Editors can do, but they can also edit all site settings and data, not just content. Additionally, administrators have full access to invite, manage or remove any other user of the site.\n\nThe Owner\nThere is only ever one owner of a Ghost site. The owner is a special user which has all the same permissions as an Administrator, but with two exceptions: The Owner can never be deleted. And in some circumstances the owner will have access to additional special settings if applicable. For example: billing details, if using Ghost(Pro).\n\nAsk all of your users to fill out their user profiles, including bio and social links. These will populate rich structured data for posts and generally create more opportunities for themes to fully populate their design.\n\nIf you\'re looking for insights, tips and reference materials to expand your content business, here\'s 5 top resources to get you started:\n\n * How to create a premium newsletter (+ some case studies)\n   Learn how others run successful paid email newsletter products\n * The ultimate guide to membership websites for creators\n   Tips to help you build, launch and grow your new membership business\n * The Newsletter Guide\n   A 201 guide for taking your newsletters to the next level\n * The proven way to find your niche, explained\n   Find the overlap and find a monetizable niche that gets noticed\n * Should you launch a referral program?\n   Strategies for building a sustainable referral growth machine','https://static.ghost.org/v4.0.0/images/admin-settings.png',0,'post','published',NULL,'public','all','2025-08-26 22:44:18','2025-08-26 22:44:18','2025-08-26 22:44:19','5951f5fc0000000000000000','A guide to collaborating with other staff users to publish, and some resources to help you with the next steps of growing your business',NULL,NULL,NULL,NULL,NULL,1),('6194d3ce51e2700162531a73','980bd92e-1124-491c-b683-a869e5049ff0','Selling premium memberships with recurring revenue','sell','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/thebrowser.jpg\",\"width\":1600,\"height\":2000,\"href\":\"https://thebrowser.com\",\"caption\":\"The Browser has over 10,000 paying subscribers\"}],[\"paywall\",{}]],\"markups\":[[\"a\",[\"href\",\"https://stripe.com\"]],[\"strong\"],[\"a\",[\"href\",\"https://stratechery.com\"]],[\"a\",[\"href\",\"https://www.theinformation.com\"]],[\"a\",[\"href\",\"https://thebrowser.com\"]]],\"sections\":[[1,\"p\",[[0,[],0,\"For creators and aspiring entrepreneurs looking to generate a sustainable recurring revenue stream from their creative work, Ghost has built-in payments allowing you to create a subscription commerce business.\"]]],[1,\"p\",[[0,[],0,\"Connect your \"],[0,[0],1,\"Stripe\"],[0,[],0,\" account to Ghost, and you\'ll be able to quickly and easily create monthly and yearly premium plans for members to subscribe to, as well as complimentary plans for friends and family.\"]]],[1,\"p\",[[0,[],0,\"Ghost takes \"],[0,[1],1,\"0% payment fees\"],[0,[],0,\", so everything you make is yours to keep!\"]]],[1,\"p\",[[0,[],0,\"Using subscriptions, you can build an independent media business like \"],[0,[2],1,\"Stratechery\"],[0,[],0,\", \"],[0,[3],1,\"The Information\"],[0,[],0,\", or \"],[0,[4],1,\"The Browser\"],[0,[],0,\".\"]]],[1,\"p\",[[0,[],0,\"The creator economy is just getting started, and Ghost allows you to build something based on technology that you own and control.\"]]],[10,0],[1,\"p\",[[0,[],0,\"Most successful subscription businesses publish a mix of free and paid posts to attract a new audience, and upsell the most loyal members to a premium offering. You can also mix different access levels within the same post, showing a free preview to logged out members and then, right when you\'re ready for a cliffhanger, that\'s a good time to...\"]]],[10,1],[1,\"p\",[[0,[],0,\"Hold back some of the best bits for paying members only! \"]]],[1,\"p\",[[0,[],0,\"The \"],[0,[1],1,\"Public preview\"],[0,[],0,\" card allows to create a divide between how much of your post should be available as a public free-preview, and how much should be restricted based on the post access level.\"]]],[1,\"p\",[[0,[],0,\"These last paragraphs are only visible on the site if you\'re logged in as a paying member. To test this out, you can connect a Stripe account, create a member account for yourself, and give yourself a complimentary premium plan.\"]]]],\"ghostVersion\":\"4.0\"}',NULL,'<p>For creators and aspiring entrepreneurs looking to generate a sustainable recurring revenue stream from their creative work, Ghost has built-in payments allowing you to create a subscription commerce business.</p><p>Connect your <a href=\"https://stripe.com\">Stripe</a> account to Ghost, and you\'ll be able to quickly and easily create monthly and yearly premium plans for members to subscribe to, as well as complimentary plans for friends and family.</p><p>Ghost takes <strong>0% payment fees</strong>, so everything you make is yours to keep!</p><p>Using subscriptions, you can build an independent media business like <a href=\"https://stratechery.com\">Stratechery</a>, <a href=\"https://www.theinformation.com\">The Information</a>, or <a href=\"https://thebrowser.com\">The Browser</a>.</p><p>The creator economy is just getting started, and Ghost allows you to build something based on technology that you own and control.</p><figure class=\"kg-card kg-image-card kg-card-hascaption\"><a href=\"https://thebrowser.com\"><img src=\"https://static.ghost.org/v4.0.0/images/thebrowser.jpg\" class=\"kg-image\" alt loading=\"lazy\" width=\"1600\" height=\"2000\"></a><figcaption>The Browser has over 10,000 paying subscribers</figcaption></figure><p>Most successful subscription businesses publish a mix of free and paid posts to attract a new audience, and upsell the most loyal members to a premium offering. You can also mix different access levels within the same post, showing a free preview to logged out members and then, right when you\'re ready for a cliffhanger, that\'s a good time to...</p><!--members-only--><p>Hold back some of the best bits for paying members only! </p><p>The <strong>Public preview</strong> card allows to create a divide between how much of your post should be available as a public free-preview, and how much should be restricted based on the post access level.</p><p>These last paragraphs are only visible on the site if you\'re logged in as a paying member. To test this out, you can connect a Stripe account, create a member account for yourself, and give yourself a complimentary premium plan.</p>','6194d3ce51e2700162531a73','For creators and aspiring entrepreneurs looking to generate a sustainable recurring revenue stream from their creative work, Ghost has built-in payments allowing you to create a subscription commerce business.\n\nConnect your Stripe account to Ghost, and you\'ll be able to quickly and easily create monthly and yearly premium plans for members to subscribe to, as well as complimentary plans for friends and family.\n\nGhost takes 0% payment fees, so everything you make is yours to keep!\n\nUsing subscriptions, you can build an independent media business like Stratechery, The Information, or The Browser.\n\nThe creator economy is just getting started, and Ghost allows you to build something based on technology that you own and control.\n\nMost successful subscription businesses publish a mix of free and paid posts to attract a new audience, and upsell the most loyal members to a premium offering. You can also mix different access levels within the same post, showing a free preview to logged out members and then, right when you\'re ready for a cliffhanger, that\'s a good time to...\n\nHold back some of the best bits for paying members only!\n\nThe Public preview card allows to create a divide between how much of your post should be available as a public free-preview, and how much should be restricted based on the post access level.\n\nThese last paragraphs are only visible on the site if you\'re logged in as a paying member. To test this out, you can connect a Stripe account, create a member account for yourself, and give yourself a complimentary premium plan.','https://static.ghost.org/v4.0.0/images/organizing-your-content.png',0,'post','published',NULL,'paid','all','2025-08-26 22:44:18','2025-08-26 22:44:18','2025-08-26 22:44:20','5951f5fc0000000000000000',NULL,NULL,NULL,NULL,NULL,NULL,1),('6194d3ce51e2700162531a74','35439684-4d64-484f-a504-7fe3ccfc5eaf','Building your audience with subscriber signups','portal','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/portalsettings.png\",\"width\":2924,\"height\":1810,\"cardWidth\":\"wide\"}],[\"hr\",{}]],\"markups\":[[\"em\"],[\"a\",[\"href\",\"#/portal\"]],[\"a\",[\"href\",\"__GHOST_URL__/sell/\"]]],\"sections\":[[1,\"p\",[[0,[],0,\"What sets Ghost apart from other products is that you can publish content and grow your audience using the same platform. Rather than just endlessly posting and hoping someone is listening, you can track real signups against your work and have them subscribe to be notified of future posts. The feature that makes all this possible is called \"],[0,[0],1,\"Portal\"],[0,[],0,\".\"]]],[1,\"p\",[[0,[],0,\"Portal is an embedded interface for your audience to sign up to your site. It works on every Ghost site, with every theme, and for any type of publisher. \"]]],[1,\"p\",[[0,[],0,\"You can customize the design, content and settings of Portal to suit your site, whether you just want people to sign up to your newsletter — or you\'re running a full premium publication with user sign-ins and private content.\"]]],[10,0],[1,\"p\",[[0,[],0,\"Once people sign up to your site, they\'ll receive an email confirmation with a link to click. The link acts as an automatic sign-in, so subscribers will be automatically signed-in to your site when they click on it. There are a couple of interesting angles to this:\"]]],[1,\"p\",[[0,[],0,\"Because subscribers are automatically able to sign in and out of your site as registered members: You can (optionally) restrict access to posts and pages depending on whether people are signed-in or not. So if you want to publish some posts for free, but keep some really great stuff for members-only, this can be a great draw to encourage people to sign up!\"]]],[1,\"p\",[[0,[],0,\"Ghost members sign in using email authentication links, so there are no passwords for people to set or forget. You can turn any list of email subscribers into a database of registered members who can sign in to your site. Like magic.\"]]],[1,\"p\",[[0,[],0,\"Portal makes all of this possible, and it appears by default as a floating button in the bottom-right corner of your site. When people are logged out, clicking it will open a sign-up/sign-in window. When members are logged in, clicking the Portal button will open the account menu where they can edit their name, email, and subscription settings.\"]]],[1,\"p\",[[0,[],0,\"The floating Portal button is completely optional. If you prefer, you can add manual links to your content, navigation, or theme to trigger it instead.\"]]],[1,\"p\",[[0,[],0,\"Like this! \"],[0,[1],1,\"Sign up here\"]]],[10,1],[1,\"p\",[[0,[],0,\"As you start to grow your registered audience, you\'ll be able to get a sense of who you\'re publishing \"],[0,[0],1,\"for\"],[0,[],0,\" and where those people are coming \"],[0,[0],1,\"from\"],[0,[],0,\". Best of all: You\'ll have a straightforward, reliable way to connect with people who enjoy your work.\"]]],[1,\"p\",[[0,[],0,\"Social networks go in and out of fashion all the time. Email addresses are timeless.\"]]],[1,\"p\",[[0,[],0,\"Growing your audience is valuable no matter what type of site you run, but if your content \"],[0,[0],1,\"is\"],[0,[],0,\" your business, then you might also be interested in \"],[0,[2],1,\"setting up premium subscriptions\"],[0,[],0,\".\"]]]],\"ghostVersion\":\"4.0\"}',NULL,'<p>What sets Ghost apart from other products is that you can publish content and grow your audience using the same platform. Rather than just endlessly posting and hoping someone is listening, you can track real signups against your work and have them subscribe to be notified of future posts. The feature that makes all this possible is called <em>Portal</em>.</p><p>Portal is an embedded interface for your audience to sign up to your site. It works on every Ghost site, with every theme, and for any type of publisher. </p><p>You can customize the design, content and settings of Portal to suit your site, whether you just want people to sign up to your newsletter — or you\'re running a full premium publication with user sign-ins and private content.</p><figure class=\"kg-card kg-image-card kg-width-wide\"><img src=\"https://static.ghost.org/v4.0.0/images/portalsettings.png\" class=\"kg-image\" alt loading=\"lazy\" width=\"2924\" height=\"1810\"></figure><p>Once people sign up to your site, they\'ll receive an email confirmation with a link to click. The link acts as an automatic sign-in, so subscribers will be automatically signed-in to your site when they click on it. There are a couple of interesting angles to this:</p><p>Because subscribers are automatically able to sign in and out of your site as registered members: You can (optionally) restrict access to posts and pages depending on whether people are signed-in or not. So if you want to publish some posts for free, but keep some really great stuff for members-only, this can be a great draw to encourage people to sign up!</p><p>Ghost members sign in using email authentication links, so there are no passwords for people to set or forget. You can turn any list of email subscribers into a database of registered members who can sign in to your site. Like magic.</p><p>Portal makes all of this possible, and it appears by default as a floating button in the bottom-right corner of your site. When people are logged out, clicking it will open a sign-up/sign-in window. When members are logged in, clicking the Portal button will open the account menu where they can edit their name, email, and subscription settings.</p><p>The floating Portal button is completely optional. If you prefer, you can add manual links to your content, navigation, or theme to trigger it instead.</p><p>Like this! <a href=\"#/portal\">Sign up here</a></p><hr><p>As you start to grow your registered audience, you\'ll be able to get a sense of who you\'re publishing <em>for</em> and where those people are coming <em>from</em>. Best of all: You\'ll have a straightforward, reliable way to connect with people who enjoy your work.</p><p>Social networks go in and out of fashion all the time. Email addresses are timeless.</p><p>Growing your audience is valuable no matter what type of site you run, but if your content <em>is</em> your business, then you might also be interested in <a href=\"__GHOST_URL__/sell/\">setting up premium subscriptions</a>.</p>','6194d3ce51e2700162531a74','What sets Ghost apart from other products is that you can publish content and grow your audience using the same platform. Rather than just endlessly posting and hoping someone is listening, you can track real signups against your work and have them subscribe to be notified of future posts. The feature that makes all this possible is called Portal.\n\nPortal is an embedded interface for your audience to sign up to your site. It works on every Ghost site, with every theme, and for any type of publisher.\n\nYou can customize the design, content and settings of Portal to suit your site, whether you just want people to sign up to your newsletter — or you\'re running a full premium publication with user sign-ins and private content.\n\nOnce people sign up to your site, they\'ll receive an email confirmation with a link to click. The link acts as an automatic sign-in, so subscribers will be automatically signed-in to your site when they click on it. There are a couple of interesting angles to this:\n\nBecause subscribers are automatically able to sign in and out of your site as registered members: You can (optionally) restrict access to posts and pages depending on whether people are signed-in or not. So if you want to publish some posts for free, but keep some really great stuff for members-only, this can be a great draw to encourage people to sign up!\n\nGhost members sign in using email authentication links, so there are no passwords for people to set or forget. You can turn any list of email subscribers into a database of registered members who can sign in to your site. Like magic.\n\nPortal makes all of this possible, and it appears by default as a floating button in the bottom-right corner of your site. When people are logged out, clicking it will open a sign-up/sign-in window. When members are logged in, clicking the Portal button will open the account menu where they can edit their name, email, and subscription settings.\n\nThe floating Portal button is completely optional. If you prefer, you can add manual links to your content, navigation, or theme to trigger it instead.\n\nLike this! Sign up here\n\nAs you start to grow your registered audience, you\'ll be able to get a sense of who you\'re publishing for and where those people are coming from. Best of all: You\'ll have a straightforward, reliable way to connect with people who enjoy your work.\n\nSocial networks go in and out of fashion all the time. Email addresses are timeless.\n\nGrowing your audience is valuable no matter what type of site you run, but if your content is your business, then you might also be interested in setting up premium subscriptions.','https://static.ghost.org/v4.0.0/images/creating-a-custom-theme.png',0,'post','published',NULL,'public','all','2025-08-26 22:44:18','2025-08-26 22:44:18','2025-08-26 22:44:21','5951f5fc0000000000000000','How Ghost allows you to turn anonymous readers into an audience of active subscribers, so you know what\'s working and what isn\'t.',NULL,NULL,NULL,NULL,NULL,1),('6194d3ce51e2700162531a75','803e5171-050b-443b-b989-a10eea5e2c95','Writing and managing content in Ghost, an advanced guide','write','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/editor.png\",\"width\":3182,\"height\":1500,\"cardWidth\":\"wide\",\"caption\":\"The Ghost editor. Also available in dark-mode, for late night writing sessions.\"}],[\"bookmark\",{\"type\":\"bookmark\",\"url\":\"https://opensubscriptionplatforms.com/\",\"metadata\":{\"url\":\"https://opensubscriptionplatforms.com\",\"title\":\"Open Subscription Platforms\",\"description\":\"A shared movement for independent subscription data.\",\"author\":null,\"publisher\":\"Open Subscription Platforms\",\"thumbnail\":\"https://opensubscriptionplatforms.com/images/osp-card.png\",\"icon\":\"https://opensubscriptionplatforms.com/images/favicon.png\"}}],[\"embed\",{\"url\":\"https://www.youtube.com/watch?v=hmH3XMlms8E\",\"html\":\"<iframe width=\\\"200\\\" height=\\\"113\\\" src=\\\"https://www.youtube.com/embed/hmH3XMlms8E?feature=oembed\\\" frameborder=\\\"0\\\" allow=\\\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\\\" allowfullscreen></iframe>\",\"type\":\"video\",\"metadata\":{\"title\":\"\\\"VELA\\\" Episode 1 of 4 | John John Florence\",\"author_name\":\"John John Florence\",\"author_url\":\"https://www.youtube.com/c/JJF\",\"height\":113,\"width\":200,\"version\":\"1.0\",\"provider_name\":\"YouTube\",\"provider_url\":\"https://www.youtube.com/\",\"thumbnail_height\":360,\"thumbnail_width\":480,\"thumbnail_url\":\"https://i.ytimg.com/vi/hmH3XMlms8E/hqdefault.jpg\"}}],[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/andreas-selter-xSMqGH7gi6o-unsplash.jpg\",\"width\":6000,\"height\":4000,\"cardWidth\":\"full\",\"caption\":\"\"}],[\"gallery\",{\"images\":[{\"fileName\":\"andreas-selter-e4yK8QQlZa0-unsplash.jpg\",\"row\":0,\"width\":4572,\"height\":3048,\"src\":\"https://static.ghost.org/v4.0.0/images/andreas-selter-e4yK8QQlZa0-unsplash.jpg\"},{\"fileName\":\"steve-carter-Ixp4YhCKZkI-unsplash.jpg\",\"row\":0,\"width\":4032,\"height\":2268,\"src\":\"https://static.ghost.org/v4.0.0/images/steve-carter-Ixp4YhCKZkI-unsplash.jpg\"}],\"caption\":\"\"}],[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/lukasz-szmigiel-jFCViYFYcus-unsplash.jpg\",\"width\":2560,\"height\":1705,\"cardWidth\":\"wide\"}],[\"gallery\",{\"images\":[{\"fileName\":\"jd-mason-hPiEFq6-Eto-unsplash.jpg\",\"row\":0,\"width\":5184,\"height\":3888,\"src\":\"https://static.ghost.org/v4.0.0/images/jd-mason-hPiEFq6-Eto-unsplash.jpg\"},{\"fileName\":\"jp-valery-OBpOP9GVH9U-unsplash.jpg\",\"row\":0,\"width\":5472,\"height\":3648,\"src\":\"https://static.ghost.org/v4.0.0/images/jp-valery-OBpOP9GVH9U-unsplash.jpg\"}],\"caption\":\"Peaceful places\"}],[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/createsnippet.png\",\"width\":2282,\"height\":1272,\"cardWidth\":\"wide\"}],[\"hr\",{}],[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/preview.png\",\"width\":3166,\"height\":2224,\"cardWidth\":\"wide\"}],[\"hr\",{}]],\"markups\":[[\"em\"],[\"code\"]],\"sections\":[[1,\"p\",[[0,[],0,\"Ghost comes with a best-in-class editor which does its very best to get out of the way, and let you focus on your content. Don\'t let its minimal looks fool you, though, beneath the surface lies a powerful editing toolset designed to accommodate the extensive needs of modern creators.\"]]],[1,\"p\",[[0,[],0,\"For many, the base canvas of the Ghost editor will feel familiar. You can start writing as you would expect, highlight content to access the toolbar you would expect, and generally use all of the keyboard shortcuts you would expect.\"]]],[1,\"p\",[[0,[],0,\"Our main focus in building the Ghost editor is to try and make as many things that you hope/expect might work: actually work. \"]]],[3,\"ul\",[[[0,[],0,\"You can copy and paste raw content from web pages, and Ghost will do its best to correctly preserve the formatting. \"]],[[0,[],0,\"Pasting an image from your clipboard will upload inline.\"]],[[0,[],0,\"Pasting a social media URL will automatically create an embed.\"]],[[0,[],0,\"Highlight a word in the editor and paste a URL from your clipboard on top: Ghost will turn it into a link.\"]],[[0,[],0,\"You can also paste (or write!) Markdown and Ghost will usually be able to auto-convert it into fully editable, formatted content.\"]]]],[10,0],[1,\"p\",[[0,[],0,\"The goal, as much as possible, is for things to work so that you don\'t have to \"],[0,[0],1,\"think\"],[0,[],0,\" so much about the editor. You won\'t find any disastrous \\\"block builders\\\" here, where you have to open 6 submenus and choose from 18 different but identical alignment options. That\'s not what Ghost is about.\"]]],[1,\"p\",[[0,[],0,\"What you will find though, is dynamic cards which allow you to embed rich media into your posts and create beautifully laid out stories.\"]]],[1,\"h2\",[[0,[],0,\"Using cards\"]]],[1,\"p\",[[0,[],0,\"You can insert dynamic cards inside post content using the \"],[0,[1],1,\"+\"],[0,[],0,\" button, which appears on new lines, or by typing \"],[0,[1],1,\"/\"],[0,[],0,\" on a new line to trigger the card menu. Many of the choices are simple and intuitive, like bookmark cards, which allow you to create rich links with embedded structured data:\"]]],[10,1],[1,\"p\",[[0,[],0,\"or embed cards which make it easy to insert content you want to share with your audience, from external services:\"]]],[10,2],[1,\"p\",[[0,[],0,\"But, dig a little deeper, and you\'ll also find more advanced cards, like one that only shows up in email newsletters (great for personalized introductions) and a comprehensive set of specialized cards for different types of images and galleries.\"]]],[1,\"blockquote\",[[0,[],0,\"Once you  start mixing text and image cards creatively, the whole narrative of the story changes. Suddenly, you\'re working in a new format.\"]]],[10,3],[1,\"p\",[[0,[],0,\"As it turns out, sometimes pictures and a thousand words go together really well. Telling people a great story often has much more impact if they can feel, even for a moment, as though they were right there with you.\"]]],[10,4],[10,5],[10,6],[1,\"p\",[[0,[],0,\"Galleries and image cards can be combined in so many different ways — the only limit is your imagination.\"]]],[1,\"h2\",[[0,[],0,\"Build workflows with snippets\"]]],[1,\"p\",[[0,[],0,\"One of the most powerful features of the Ghost editor is the ability to create and re-use content snippets. If you\'ve ever used an email client with a concept of \"],[0,[0],1,\"saved replies\"],[0,[],0,\" then this will be immediately intuitive.\"]]],[1,\"p\",[[0,[],0,\"To create a snippet, select a piece of content in the editor that you\'d like to re-use in future, then click on the snippet icon in the toolbar. Give your snippet a name, and you\'re all done. Now your snippet will be available from within the card menu, or you can search for it directly using the \"],[0,[1],1,\"/\"],[0,[],0,\" command.\"]]],[1,\"p\",[[0,[],0,\"This works really well for saving images you might want to use often, like a company logo or team photo, links to resources you find yourself often linking to, or introductions and passages that you want to remember.\"]]],[10,7],[1,\"p\",[[0,[],0,\"You can even build entire post templates or outlines to create a quick, re-usable workflow for publishing over time. Or build custom design elements for your post with an HTML card, and use a snippet to insert it.\"]]],[1,\"p\",[[0,[],0,\"Once you get a few useful snippets set up, it\'s difficult to go back to the old way of diving through media libraries and trawling for that one thing you know you used somewhere that one time.\"]]],[10,8],[1,\"h2\",[[0,[],0,\"Publishing and newsletters the easy way\"]]],[1,\"p\",[[0,[],0,\"When you\'re ready to publish, Ghost makes it as simple as possible to deliver your new post to all your existing members. Just hit the \"],[0,[0],1,\"Preview\"],[0,[],0,\" link and you\'ll get a chance to see what your content looks like on Web, Mobile, Email and Social.\"]]],[10,9],[1,\"p\",[[0,[],0,\"You can send yourself a test newsletter to make sure everything looks good in your email client, and then hit the \"],[0,[0],1,\"Publish\"],[0,[],0,\" button to decide who to deliver it to.\"]]],[1,\"p\",[[0,[],0,\"Ghost comes with a streamlined, optimized email newsletter template that has settings built-in for you to customize the colors and typography. We\'ve spent countless hours refining the template to make sure it works great across all email clients, and performs well for email deliverability.\"]]],[1,\"p\",[[0,[],0,\"So, you don\'t need to fight the awful process of building a custom email template from scratch. It\'s all done already!\"]]],[10,10],[1,\"p\",[[0,[],0,\"The Ghost editor is powerful enough to do whatever you want it to do. With a little exploration, you\'ll be up and running in no time.\"]]]],\"ghostVersion\":\"4.0\"}',NULL,'<p>Ghost comes with a best-in-class editor which does its very best to get out of the way, and let you focus on your content. Don\'t let its minimal looks fool you, though, beneath the surface lies a powerful editing toolset designed to accommodate the extensive needs of modern creators.</p><p>For many, the base canvas of the Ghost editor will feel familiar. You can start writing as you would expect, highlight content to access the toolbar you would expect, and generally use all of the keyboard shortcuts you would expect.</p><p>Our main focus in building the Ghost editor is to try and make as many things that you hope/expect might work: actually work. </p><ul><li>You can copy and paste raw content from web pages, and Ghost will do its best to correctly preserve the formatting. </li><li>Pasting an image from your clipboard will upload inline.</li><li>Pasting a social media URL will automatically create an embed.</li><li>Highlight a word in the editor and paste a URL from your clipboard on top: Ghost will turn it into a link.</li><li>You can also paste (or write!) Markdown and Ghost will usually be able to auto-convert it into fully editable, formatted content.</li></ul><figure class=\"kg-card kg-image-card kg-width-wide kg-card-hascaption\"><img src=\"https://static.ghost.org/v4.0.0/images/editor.png\" class=\"kg-image\" alt loading=\"lazy\" width=\"3182\" height=\"1500\"><figcaption>The Ghost editor. Also available in dark-mode, for late night writing sessions.</figcaption></figure><p>The goal, as much as possible, is for things to work so that you don\'t have to <em>think</em> so much about the editor. You won\'t find any disastrous \"block builders\" here, where you have to open 6 submenus and choose from 18 different but identical alignment options. That\'s not what Ghost is about.</p><p>What you will find though, is dynamic cards which allow you to embed rich media into your posts and create beautifully laid out stories.</p><h2 id=\"using-cards\">Using cards</h2><p>You can insert dynamic cards inside post content using the <code>+</code> button, which appears on new lines, or by typing <code>/</code> on a new line to trigger the card menu. Many of the choices are simple and intuitive, like bookmark cards, which allow you to create rich links with embedded structured data:</p><figure class=\"kg-card kg-bookmark-card\"><a class=\"kg-bookmark-container\" href=\"https://opensubscriptionplatforms.com/\"><div class=\"kg-bookmark-content\"><div class=\"kg-bookmark-title\">Open Subscription Platforms</div><div class=\"kg-bookmark-description\">A shared movement for independent subscription data.</div><div class=\"kg-bookmark-metadata\"><img class=\"kg-bookmark-icon\" src=\"https://opensubscriptionplatforms.com/images/favicon.png\" alt=\"\"><span class=\"kg-bookmark-author\">Open Subscription Platforms</span></div></div><div class=\"kg-bookmark-thumbnail\"><img src=\"https://opensubscriptionplatforms.com/images/osp-card.png\" alt=\"\"></div></a></figure><p>or embed cards which make it easy to insert content you want to share with your audience, from external services:</p><figure class=\"kg-card kg-embed-card\"><iframe width=\"200\" height=\"113\" src=\"https://www.youtube.com/embed/hmH3XMlms8E?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen></iframe></figure><p>But, dig a little deeper, and you\'ll also find more advanced cards, like one that only shows up in email newsletters (great for personalized introductions) and a comprehensive set of specialized cards for different types of images and galleries.</p><blockquote>Once you  start mixing text and image cards creatively, the whole narrative of the story changes. Suddenly, you\'re working in a new format.</blockquote><figure class=\"kg-card kg-image-card kg-width-full\"><img src=\"https://static.ghost.org/v4.0.0/images/andreas-selter-xSMqGH7gi6o-unsplash.jpg\" class=\"kg-image\" alt loading=\"lazy\" width=\"6000\" height=\"4000\"></figure><p>As it turns out, sometimes pictures and a thousand words go together really well. Telling people a great story often has much more impact if they can feel, even for a moment, as though they were right there with you.</p><figure class=\"kg-card kg-gallery-card kg-width-wide\"><div class=\"kg-gallery-container\"><div class=\"kg-gallery-row\"><div class=\"kg-gallery-image\"><img src=\"https://static.ghost.org/v4.0.0/images/andreas-selter-e4yK8QQlZa0-unsplash.jpg\" width=\"4572\" height=\"3048\" loading=\"lazy\" alt></div><div class=\"kg-gallery-image\"><img src=\"https://static.ghost.org/v4.0.0/images/steve-carter-Ixp4YhCKZkI-unsplash.jpg\" width=\"4032\" height=\"2268\" loading=\"lazy\" alt></div></div></div></figure><figure class=\"kg-card kg-image-card kg-width-wide\"><img src=\"https://static.ghost.org/v4.0.0/images/lukasz-szmigiel-jFCViYFYcus-unsplash.jpg\" class=\"kg-image\" alt loading=\"lazy\" width=\"2560\" height=\"1705\"></figure><figure class=\"kg-card kg-gallery-card kg-width-wide kg-card-hascaption\"><div class=\"kg-gallery-container\"><div class=\"kg-gallery-row\"><div class=\"kg-gallery-image\"><img src=\"https://static.ghost.org/v4.0.0/images/jd-mason-hPiEFq6-Eto-unsplash.jpg\" width=\"5184\" height=\"3888\" loading=\"lazy\" alt></div><div class=\"kg-gallery-image\"><img src=\"https://static.ghost.org/v4.0.0/images/jp-valery-OBpOP9GVH9U-unsplash.jpg\" width=\"5472\" height=\"3648\" loading=\"lazy\" alt></div></div></div><figcaption>Peaceful places</figcaption></figure><p>Galleries and image cards can be combined in so many different ways — the only limit is your imagination.</p><h2 id=\"build-workflows-with-snippets\">Build workflows with snippets</h2><p>One of the most powerful features of the Ghost editor is the ability to create and re-use content snippets. If you\'ve ever used an email client with a concept of <em>saved replies</em> then this will be immediately intuitive.</p><p>To create a snippet, select a piece of content in the editor that you\'d like to re-use in future, then click on the snippet icon in the toolbar. Give your snippet a name, and you\'re all done. Now your snippet will be available from within the card menu, or you can search for it directly using the <code>/</code> command.</p><p>This works really well for saving images you might want to use often, like a company logo or team photo, links to resources you find yourself often linking to, or introductions and passages that you want to remember.</p><figure class=\"kg-card kg-image-card kg-width-wide\"><img src=\"https://static.ghost.org/v4.0.0/images/createsnippet.png\" class=\"kg-image\" alt loading=\"lazy\" width=\"2282\" height=\"1272\"></figure><p>You can even build entire post templates or outlines to create a quick, re-usable workflow for publishing over time. Or build custom design elements for your post with an HTML card, and use a snippet to insert it.</p><p>Once you get a few useful snippets set up, it\'s difficult to go back to the old way of diving through media libraries and trawling for that one thing you know you used somewhere that one time.</p><hr><h2 id=\"publishing-and-newsletters-the-easy-way\">Publishing and newsletters the easy way</h2><p>When you\'re ready to publish, Ghost makes it as simple as possible to deliver your new post to all your existing members. Just hit the <em>Preview</em> link and you\'ll get a chance to see what your content looks like on Web, Mobile, Email and Social.</p><figure class=\"kg-card kg-image-card kg-width-wide\"><img src=\"https://static.ghost.org/v4.0.0/images/preview.png\" class=\"kg-image\" alt loading=\"lazy\" width=\"3166\" height=\"2224\"></figure><p>You can send yourself a test newsletter to make sure everything looks good in your email client, and then hit the <em>Publish</em> button to decide who to deliver it to.</p><p>Ghost comes with a streamlined, optimized email newsletter template that has settings built-in for you to customize the colors and typography. We\'ve spent countless hours refining the template to make sure it works great across all email clients, and performs well for email deliverability.</p><p>So, you don\'t need to fight the awful process of building a custom email template from scratch. It\'s all done already!</p><hr><p>The Ghost editor is powerful enough to do whatever you want it to do. With a little exploration, you\'ll be up and running in no time.</p>','6194d3ce51e2700162531a75','Ghost comes with a best-in-class editor which does its very best to get out of the way, and let you focus on your content. Don\'t let its minimal looks fool you, though, beneath the surface lies a powerful editing toolset designed to accommodate the extensive needs of modern creators.\n\nFor many, the base canvas of the Ghost editor will feel familiar. You can start writing as you would expect, highlight content to access the toolbar you would expect, and generally use all of the keyboard shortcuts you would expect.\n\nOur main focus in building the Ghost editor is to try and make as many things that you hope/expect might work: actually work.\n\n * You can copy and paste raw content from web pages, and Ghost will do its best to correctly preserve the formatting.\n * Pasting an image from your clipboard will upload inline.\n * Pasting a social media URL will automatically create an embed.\n * Highlight a word in the editor and paste a URL from your clipboard on top: Ghost will turn it into a link.\n * You can also paste (or write!) Markdown and Ghost will usually be able to auto-convert it into fully editable, formatted content.\n\nThe goal, as much as possible, is for things to work so that you don\'t have to think so much about the editor. You won\'t find any disastrous \"block builders\" here, where you have to open 6 submenus and choose from 18 different but identical alignment options. That\'s not what Ghost is about.\n\nWhat you will find though, is dynamic cards which allow you to embed rich media into your posts and create beautifully laid out stories.\n\n\nUsing cards\n\nYou can insert dynamic cards inside post content using the + button, which appears on new lines, or by typing / on a new line to trigger the card menu. Many of the choices are simple and intuitive, like bookmark cards, which allow you to create rich links with embedded structured data:\n\nOpen Subscription PlatformsA shared movement for independent subscription data.Open Subscription Platforms\n\nor embed cards which make it easy to insert content you want to share with your audience, from external services:\n\nBut, dig a little deeper, and you\'ll also find more advanced cards, like one that only shows up in email newsletters (great for personalized introductions) and a comprehensive set of specialized cards for different types of images and galleries.\n\nOnce you  start mixing text and image cards creatively, the whole narrative of the story changes. Suddenly, you\'re working in a new format.\n\nAs it turns out, sometimes pictures and a thousand words go together really well. Telling people a great story often has much more impact if they can feel, even for a moment, as though they were right there with you.\n\nGalleries and image cards can be combined in so many different ways — the only limit is your imagination.\n\n\nBuild workflows with snippets\n\nOne of the most powerful features of the Ghost editor is the ability to create and re-use content snippets. If you\'ve ever used an email client with a concept of saved replies then this will be immediately intuitive.\n\nTo create a snippet, select a piece of content in the editor that you\'d like to re-use in future, then click on the snippet icon in the toolbar. Give your snippet a name, and you\'re all done. Now your snippet will be available from within the card menu, or you can search for it directly using the / command.\n\nThis works really well for saving images you might want to use often, like a company logo or team photo, links to resources you find yourself often linking to, or introductions and passages that you want to remember.\n\nYou can even build entire post templates or outlines to create a quick, re-usable workflow for publishing over time. Or build custom design elements for your post with an HTML card, and use a snippet to insert it.\n\nOnce you get a few useful snippets set up, it\'s difficult to go back to the old way of diving through media libraries and trawling for that one thing you know you used somewhere that one time.\n\n\nPublishing and newsletters the easy way\n\nWhen you\'re ready to publish, Ghost makes it as simple as possible to deliver your new post to all your existing members. Just hit the Preview link and you\'ll get a chance to see what your content looks like on Web, Mobile, Email and Social.\n\nYou can send yourself a test newsletter to make sure everything looks good in your email client, and then hit the Publish button to decide who to deliver it to.\n\nGhost comes with a streamlined, optimized email newsletter template that has settings built-in for you to customize the colors and typography. We\'ve spent countless hours refining the template to make sure it works great across all email clients, and performs well for email deliverability.\n\nSo, you don\'t need to fight the awful process of building a custom email template from scratch. It\'s all done already!\n\nThe Ghost editor is powerful enough to do whatever you want it to do. With a little exploration, you\'ll be up and running in no time.','https://static.ghost.org/v4.0.0/images/writing-posts-with-ghost.png',0,'post','published',NULL,'public','all','2025-08-26 22:44:18','2025-08-26 22:44:18','2025-08-26 22:44:22','5951f5fc0000000000000000','A full overview of all the features built into the Ghost editor, including powerful workflow automations to speed up your creative process.',NULL,NULL,NULL,NULL,NULL,1),('6194d3ce51e2700162531a76','d2531bdd-e6c1-4be4-9bc8-8fd79a75ce66','Customizing your brand and design settings','design','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/brandsettings.png\",\"width\":3456,\"height\":2338,\"cardWidth\":\"wide\",\"caption\":\"Ghost Admin → Settings → Branding\"}],[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/themesettings.png\",\"width\":3208,\"height\":1618,\"cardWidth\":\"wide\",\"caption\":\"Ghost Admin → Settings → Theme\"}],[\"code\",{\"code\":\"{{#post}}\\n<article class=\\\"article {{post_class}}\\\">\\n\\n    <h1>{{title}}</h1>\\n    \\n    {{#if feature_image}}\\n    \\t<img src=\\\"{{feature_image}}\\\" alt=\\\"Feature image\\\" />\\n    {{/if}}\\n    \\n    {{content}}\\n\\n</article>\\n{{/post}}\",\"language\":\"handlebars\",\"caption\":\"A snippet from a post template\"}]],\"markups\":[[\"a\",[\"href\",\"__GHOST_URL__/welcome/\"]],[\"strong\"],[\"em\"],[\"a\",[\"href\",\"https://ghost.org/themes/\"]],[\"a\",[\"href\",\"https://github.com/tryghost/casper/\"]],[\"a\",[\"href\",\"https://ghost.org/docs/themes/\"]]],\"sections\":[[1,\"p\",[[0,[],0,\"As discussed in the \"],[0,[0],1,\"introduction\"],[0,[],0,\" post, one of the best things about Ghost is just how much you can customize to turn your site into something unique. Everything about your layout and design can be changed, so you\'re not stuck with yet another clone of a social network profile.\"]]],[1,\"p\",[[0,[],0,\"How far you want to go with customization is completely up to you, there\'s no right or wrong approach! The majority of people use one of Ghost\'s built-in themes to get started, and then progress to something more bespoke later on as their site grows. \"]]],[1,\"p\",[[0,[],0,\"The best way to get started is with Ghost\'s branding settings, where you can set up colors, images and logos to fit with your brand.\"]]],[10,0],[1,\"p\",[[0,[],0,\"Any Ghost theme that\'s up to date and compatible with Ghost 4.0 and higher will reflect your branding settings in the preview window, so you can see what your site will look like as you experiment with different options.\"]]],[1,\"p\",[[0,[],0,\"When selecting an accent color, try to choose something which will contrast well with white text. Many themes will use your accent color as the background for buttons, headers and navigational elements. Vibrant colors with a darker hue tend to work best, as a general rule.\"]]],[1,\"h2\",[[0,[],0,\"Installing Ghost themes\"]]],[1,\"p\",[[0,[],0,\"By default, new sites are created with Ghost\'s friendly publication theme, called Casper. Everything in Casper is optimized to work for the most common types of blog, newsletter and publication that people create with Ghost — so it\'s a perfect place to start.\"]]],[1,\"p\",[[0,[],0,\"However, there are hundreds of different themes available to install, so you can pick out a look and feel that suits you best.\"]]],[10,1],[1,\"p\",[[0,[],0,\"Inside Ghost\'s theme settings you\'ll find 4 more official themes that can be directly installed and activated. Each theme is suited to slightly different use-cases.\"]]],[3,\"ul\",[[[0,[1],1,\"Casper\"],[0,[],0,\" \"],[0,[2],1,\"(default)\"],[0,[],0,\" — Made for all sorts of blogs and newsletters\"]],[[0,[1],1,\"Edition\"],[0,[],0,\" — A beautiful minimal template for newsletter authors\"]],[[0,[1],1,\"Alto\"],[0,[],0,\" — A slick news/magazine style design for creators\"]],[[0,[1],1,\"London\"],[0,[],0,\" — A light photography theme with a bold grid\"]],[[0,[1],1,\"Ease\"],[0,[],0,\" — A library theme for organizing large content archives\"]]]],[1,\"p\",[[0,[],0,\"And if none of those feel quite right, head on over to the \"],[0,[3],1,\"Ghost Marketplace\"],[0,[],0,\", where you\'ll find a huge variety of both free and premium themes.\"]]],[1,\"h2\",[[0,[],0,\"Building something custom\"]]],[1,\"p\",[[0,[],0,\"Finally, if you want something completely bespoke for your site, you can always build a custom theme from scratch and upload it to your site.\"]]],[1,\"p\",[[0,[],0,\"Ghost\'s theming template files are very easy to work with, and can be picked up in the space of a few hours by anyone who has just a little bit of knowledge of HTML and CSS. Templates from other platforms can also be ported to Ghost with relatively little effort.\"]]],[1,\"p\",[[0,[],0,\"If you want to take a quick look at the theme syntax to see what it\'s like, you can \"],[0,[4],1,\"browse through the files of the default Casper theme\"],[0,[],0,\". We\'ve added tons of inline code comments to make it easy to learn, and the structure is very readable.\"]]],[10,2],[1,\"p\",[[0,[],0,\"See? Not that scary! But still completely optional. \"]]],[1,\"p\",[[0,[],0,\"If you\'re interested in creating your own Ghost theme, check out our extensive \"],[0,[5],1,\"theme documentation\"],[0,[],0,\" for a full guide to all the different template variables and helpers which are available.\"]]]],\"ghostVersion\":\"4.0\"}',NULL,'<p>As discussed in the <a href=\"__GHOST_URL__/welcome/\">introduction</a> post, one of the best things about Ghost is just how much you can customize to turn your site into something unique. Everything about your layout and design can be changed, so you\'re not stuck with yet another clone of a social network profile.</p><p>How far you want to go with customization is completely up to you, there\'s no right or wrong approach! The majority of people use one of Ghost\'s built-in themes to get started, and then progress to something more bespoke later on as their site grows. </p><p>The best way to get started is with Ghost\'s branding settings, where you can set up colors, images and logos to fit with your brand.</p><figure class=\"kg-card kg-image-card kg-width-wide kg-card-hascaption\"><img src=\"https://static.ghost.org/v4.0.0/images/brandsettings.png\" class=\"kg-image\" alt loading=\"lazy\" width=\"3456\" height=\"2338\"><figcaption>Ghost Admin → Settings → Branding</figcaption></figure><p>Any Ghost theme that\'s up to date and compatible with Ghost 4.0 and higher will reflect your branding settings in the preview window, so you can see what your site will look like as you experiment with different options.</p><p>When selecting an accent color, try to choose something which will contrast well with white text. Many themes will use your accent color as the background for buttons, headers and navigational elements. Vibrant colors with a darker hue tend to work best, as a general rule.</p><h2 id=\"installing-ghost-themes\">Installing Ghost themes</h2><p>By default, new sites are created with Ghost\'s friendly publication theme, called Casper. Everything in Casper is optimized to work for the most common types of blog, newsletter and publication that people create with Ghost — so it\'s a perfect place to start.</p><p>However, there are hundreds of different themes available to install, so you can pick out a look and feel that suits you best.</p><figure class=\"kg-card kg-image-card kg-width-wide kg-card-hascaption\"><img src=\"https://static.ghost.org/v4.0.0/images/themesettings.png\" class=\"kg-image\" alt loading=\"lazy\" width=\"3208\" height=\"1618\"><figcaption>Ghost Admin → Settings → Theme</figcaption></figure><p>Inside Ghost\'s theme settings you\'ll find 4 more official themes that can be directly installed and activated. Each theme is suited to slightly different use-cases.</p><ul><li><strong>Casper</strong> <em>(default)</em> — Made for all sorts of blogs and newsletters</li><li><strong>Edition</strong> — A beautiful minimal template for newsletter authors</li><li><strong>Alto</strong> — A slick news/magazine style design for creators</li><li><strong>London</strong> — A light photography theme with a bold grid</li><li><strong>Ease</strong> — A library theme for organizing large content archives</li></ul><p>And if none of those feel quite right, head on over to the <a href=\"https://ghost.org/themes/\">Ghost Marketplace</a>, where you\'ll find a huge variety of both free and premium themes.</p><h2 id=\"building-something-custom\">Building something custom</h2><p>Finally, if you want something completely bespoke for your site, you can always build a custom theme from scratch and upload it to your site.</p><p>Ghost\'s theming template files are very easy to work with, and can be picked up in the space of a few hours by anyone who has just a little bit of knowledge of HTML and CSS. Templates from other platforms can also be ported to Ghost with relatively little effort.</p><p>If you want to take a quick look at the theme syntax to see what it\'s like, you can <a href=\"https://github.com/tryghost/casper/\">browse through the files of the default Casper theme</a>. We\'ve added tons of inline code comments to make it easy to learn, and the structure is very readable.</p><figure class=\"kg-card kg-code-card\"><pre><code class=\"language-handlebars\">{{#post}}\n&lt;article class=\"article {{post_class}}\"&gt;\n\n    &lt;h1&gt;{{title}}&lt;/h1&gt;\n    \n    {{#if feature_image}}\n    	&lt;img src=\"{{feature_image}}\" alt=\"Feature image\" /&gt;\n    {{/if}}\n    \n    {{content}}\n\n&lt;/article&gt;\n{{/post}}</code></pre><figcaption>A snippet from a post template</figcaption></figure><p>See? Not that scary! But still completely optional. </p><p>If you\'re interested in creating your own Ghost theme, check out our extensive <a href=\"https://ghost.org/docs/themes/\">theme documentation</a> for a full guide to all the different template variables and helpers which are available.</p>','6194d3ce51e2700162531a76','As discussed in the introduction post, one of the best things about Ghost is just how much you can customize to turn your site into something unique. Everything about your layout and design can be changed, so you\'re not stuck with yet another clone of a social network profile.\n\nHow far you want to go with customization is completely up to you, there\'s no right or wrong approach! The majority of people use one of Ghost\'s built-in themes to get started, and then progress to something more bespoke later on as their site grows.\n\nThe best way to get started is with Ghost\'s branding settings, where you can set up colors, images and logos to fit with your brand.\n\nAny Ghost theme that\'s up to date and compatible with Ghost 4.0 and higher will reflect your branding settings in the preview window, so you can see what your site will look like as you experiment with different options.\n\nWhen selecting an accent color, try to choose something which will contrast well with white text. Many themes will use your accent color as the background for buttons, headers and navigational elements. Vibrant colors with a darker hue tend to work best, as a general rule.\n\n\nInstalling Ghost themes\n\nBy default, new sites are created with Ghost\'s friendly publication theme, called Casper. Everything in Casper is optimized to work for the most common types of blog, newsletter and publication that people create with Ghost — so it\'s a perfect place to start.\n\nHowever, there are hundreds of different themes available to install, so you can pick out a look and feel that suits you best.\n\nInside Ghost\'s theme settings you\'ll find 4 more official themes that can be directly installed and activated. Each theme is suited to slightly different use-cases.\n\n * Casper (default) — Made for all sorts of blogs and newsletters\n * Edition — A beautiful minimal template for newsletter authors\n * Alto — A slick news/magazine style design for creators\n * London — A light photography theme with a bold grid\n * Ease — A library theme for organizing large content archives\n\nAnd if none of those feel quite right, head on over to the Ghost Marketplace, where you\'ll find a huge variety of both free and premium themes.\n\n\nBuilding something custom\n\nFinally, if you want something completely bespoke for your site, you can always build a custom theme from scratch and upload it to your site.\n\nGhost\'s theming template files are very easy to work with, and can be picked up in the space of a few hours by anyone who has just a little bit of knowledge of HTML and CSS. Templates from other platforms can also be ported to Ghost with relatively little effort.\n\nIf you want to take a quick look at the theme syntax to see what it\'s like, you can browse through the files of the default Casper theme. We\'ve added tons of inline code comments to make it easy to learn, and the structure is very readable.\n\n{{#post}}\n<article class=\"article {{post_class}}\">\n\n    <h1>{{title}}</h1>\n    \n    {{#if feature_image}}\n    	<img src=\"{{feature_image}}\" alt=\"Feature image\" />\n    {{/if}}\n    \n    {{content}}\n\n</article>\n{{/post}}\n\nSee? Not that scary! But still completely optional.\n\nIf you\'re interested in creating your own Ghost theme, check out our extensive theme documentation for a full guide to all the different template variables and helpers which are available.','https://static.ghost.org/v4.0.0/images/publishing-options.png',0,'post','published',NULL,'public','all','2025-08-26 22:44:18','2025-08-26 22:44:18','2025-08-26 22:44:23','5951f5fc0000000000000000','How to tweak a few settings in Ghost to transform your site from a generic template to a custom brand with style and personality.',NULL,NULL,NULL,NULL,NULL,1),('6194d3ce51e2700162531a77','b7a6775c-1a03-4bb4-a4df-26142e039ebd','Start here for a quick overview of everything you need to know','welcome','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"hr\",{}],[\"hr\",{}]],\"markups\":[[\"strong\"],[\"a\",[\"href\",\"__GHOST_URL__/design/\"]],[\"a\",[\"href\",\"__GHOST_URL__/write/\"]],[\"a\",[\"href\",\"__GHOST_URL__/portal/\"]],[\"a\",[\"href\",\"__GHOST_URL__/sell/\"]],[\"a\",[\"href\",\"__GHOST_URL__/grow/\"]],[\"a\",[\"href\",\"__GHOST_URL__/integrations/\"]],[\"a\",[\"href\",\"https://ghost.org/blog/\"]],[\"a\",[\"href\",\"https://ghost.org/pricing/\"]],[\"em\"],[\"a\",[\"href\",\"https://forum.ghost.org\"]]],\"sections\":[[1,\"p\",[[0,[0],1,\"Hey there\"],[0,[],0,\", welcome to your new home on the web! \"]]],[1,\"p\",[[0,[],0,\"Unlike social networks, this one is all yours. Publish your work on a custom domain, invite your audience to subscribe, send them new content by email newsletter, and offer premium subscriptions to generate sustainable recurring revenue to fund your work. \"]]],[1,\"p\",[[0,[],0,\"Ghost is an independent, open source app, which means you can customize absolutely everything. Inside the admin area, you\'ll find straightforward controls for changing themes, colors, navigation, logos and settings — so you can set your site up just how you like it. No technical knowledge required.\"]]],[1,\"p\",[[0,[],0,\"If you\'re feeling a little more adventurous, there\'s really no limit to what\'s possible. With just a little bit of HTML and CSS you can modify or build your very own theme from scratch, or connect to Zapier to explore advanced integrations. Advanced developers can go even further and build entirely custom workflows using the Ghost API.\"]]],[1,\"p\",[[0,[],0,\"This level of customization means that Ghost grows with you. It\'s easy to get started, but there\'s always another level of what\'s possible. So, you won\'t find yourself outgrowing the app in a few months time and wishing you\'d chosen something more powerful!\"]]],[10,0],[1,\"p\",[[0,[],0,\"For now, you\'re probably just wondering what to do first. To help get you going as quickly as possible, we\'ve populated your site with starter content (like this post!) covering all the key concepts and features of the product.\"]]],[1,\"p\",[[0,[],0,\"You\'ll find an outline of all the different topics below, with links to each section so you can explore the parts that interest you most.\"]]],[1,\"p\",[[0,[],0,\"Once you\'re ready to begin publishing and want to clear out these starter posts, you can delete the \\\"Ghost\\\" staff user. Deleting an author will automatically remove all of their posts, leaving you with a clean blank canvas.\"]]],[1,\"h2\",[[0,[],0,\"Your guide to Ghost\"]]],[3,\"ul\",[[[0,[1],1,\"Customizing your brand and site settings\"]],[[0,[2],1,\"Writing & managing content, an advanced guide for creators\"]],[[0,[3],1,\"Building your audience with subscriber signups\"]],[[0,[4],1,\"Selling premium memberships with recurring revenue\"]],[[0,[5],1,\"How to grow your business around an audience\"]],[[0,[6],1,\"Setting up custom integrations and apps\"]]]],[1,\"p\",[[0,[],0,\"If you get through all those and you\'re hungry for more, you can find an extensive library of content for creators over on \"],[0,[7],1,\"the Ghost blog\"],[0,[],0,\".\"]]],[10,1],[1,\"h2\",[[0,[],0,\"Getting help\"]]],[1,\"p\",[[0,[],0,\"If you need help, \"],[0,[8],1,\"Ghost(Pro)\"],[0,[],0,\" customers can always reach our full-time support team by clicking on the \"],[0,[9],1,\"Ghost(Pro)\"],[0,[],0,\" link inside their admin panel.\"]]],[1,\"p\",[[0,[],0,\"If you\'re a developer working with the codebase in a self-managed install, check out our \"],[0,[10],1,\"developer community forum\"],[0,[],0,\" to chat with other users.\"]]],[1,\"p\",[[0,[],0,\"Have fun!\"]]]],\"ghostVersion\":\"4.0\"}',NULL,'<p><strong>Hey there</strong>, welcome to your new home on the web! </p><p>Unlike social networks, this one is all yours. Publish your work on a custom domain, invite your audience to subscribe, send them new content by email newsletter, and offer premium subscriptions to generate sustainable recurring revenue to fund your work. </p><p>Ghost is an independent, open source app, which means you can customize absolutely everything. Inside the admin area, you\'ll find straightforward controls for changing themes, colors, navigation, logos and settings — so you can set your site up just how you like it. No technical knowledge required.</p><p>If you\'re feeling a little more adventurous, there\'s really no limit to what\'s possible. With just a little bit of HTML and CSS you can modify or build your very own theme from scratch, or connect to Zapier to explore advanced integrations. Advanced developers can go even further and build entirely custom workflows using the Ghost API.</p><p>This level of customization means that Ghost grows with you. It\'s easy to get started, but there\'s always another level of what\'s possible. So, you won\'t find yourself outgrowing the app in a few months time and wishing you\'d chosen something more powerful!</p><hr><p>For now, you\'re probably just wondering what to do first. To help get you going as quickly as possible, we\'ve populated your site with starter content (like this post!) covering all the key concepts and features of the product.</p><p>You\'ll find an outline of all the different topics below, with links to each section so you can explore the parts that interest you most.</p><p>Once you\'re ready to begin publishing and want to clear out these starter posts, you can delete the \"Ghost\" staff user. Deleting an author will automatically remove all of their posts, leaving you with a clean blank canvas.</p><h2 id=\"your-guide-to-ghost\">Your guide to Ghost</h2><ul><li><a href=\"__GHOST_URL__/design/\">Customizing your brand and site settings</a></li><li><a href=\"__GHOST_URL__/write/\">Writing &amp; managing content, an advanced guide for creators</a></li><li><a href=\"__GHOST_URL__/portal/\">Building your audience with subscriber signups</a></li><li><a href=\"__GHOST_URL__/sell/\">Selling premium memberships with recurring revenue</a></li><li><a href=\"__GHOST_URL__/grow/\">How to grow your business around an audience</a></li><li><a href=\"__GHOST_URL__/integrations/\">Setting up custom integrations and apps</a></li></ul><p>If you get through all those and you\'re hungry for more, you can find an extensive library of content for creators over on <a href=\"https://ghost.org/blog/\">the Ghost blog</a>.</p><hr><h2 id=\"getting-help\">Getting help</h2><p>If you need help, <a href=\"https://ghost.org/pricing/\">Ghost(Pro)</a> customers can always reach our full-time support team by clicking on the <em>Ghost(Pro)</em> link inside their admin panel.</p><p>If you\'re a developer working with the codebase in a self-managed install, check out our <a href=\"https://forum.ghost.org\">developer community forum</a> to chat with other users.</p><p>Have fun!</p>','6194d3ce51e2700162531a77','Hey there, welcome to your new home on the web!\n\nUnlike social networks, this one is all yours. Publish your work on a custom domain, invite your audience to subscribe, send them new content by email newsletter, and offer premium subscriptions to generate sustainable recurring revenue to fund your work.\n\nGhost is an independent, open source app, which means you can customize absolutely everything. Inside the admin area, you\'ll find straightforward controls for changing themes, colors, navigation, logos and settings — so you can set your site up just how you like it. No technical knowledge required.\n\nIf you\'re feeling a little more adventurous, there\'s really no limit to what\'s possible. With just a little bit of HTML and CSS you can modify or build your very own theme from scratch, or connect to Zapier to explore advanced integrations. Advanced developers can go even further and build entirely custom workflows using the Ghost API.\n\nThis level of customization means that Ghost grows with you. It\'s easy to get started, but there\'s always another level of what\'s possible. So, you won\'t find yourself outgrowing the app in a few months time and wishing you\'d chosen something more powerful!\n\nFor now, you\'re probably just wondering what to do first. To help get you going as quickly as possible, we\'ve populated your site with starter content (like this post!) covering all the key concepts and features of the product.\n\nYou\'ll find an outline of all the different topics below, with links to each section so you can explore the parts that interest you most.\n\nOnce you\'re ready to begin publishing and want to clear out these starter posts, you can delete the \"Ghost\" staff user. Deleting an author will automatically remove all of their posts, leaving you with a clean blank canvas.\n\n\nYour guide to Ghost\n\n * Customizing your brand and site settings\n * Writing & managing content, an advanced guide for creators\n * Building your audience with subscriber signups\n * Selling premium memberships with recurring revenue\n * How to grow your business around an audience\n * Setting up custom integrations and apps\n\nIf you get through all those and you\'re hungry for more, you can find an extensive library of content for creators over on the Ghost blog.\n\n\nGetting help\n\nIf you need help, Ghost(Pro) customers can always reach our full-time support team by clicking on the Ghost(Pro) link inside their admin panel.\n\nIf you\'re a developer working with the codebase in a self-managed install, check out our developer community forum to chat with other users.\n\nHave fun!','https://static.ghost.org/v4.0.0/images/welcome-to-ghost.png',0,'post','published',NULL,'public','all','2025-08-26 22:44:18','2025-08-26 22:44:18','2025-08-26 22:44:24','5951f5fc0000000000000000','We\'ve crammed the most important information to help you get started with Ghost into this one post. It\'s your cheat-sheet to get started, and your shortcut to advanced features.',NULL,NULL,NULL,NULL,NULL,1),('6194d3ce51e2700162531a78','632cf732-7299-4635-9570-345b9786d592','About this site','about','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"hr\",{}]],\"markups\":[[\"a\",[\"href\",\"https://ghost.org\"]]],\"sections\":[[1,\"p\",[[0,[],0,\"Test Blog is an independent publication launched in August 2025 by Test Admin. If you subscribe today, you\'ll get full access to the website as well as email newsletters about new content when it\'s available. Your subscription makes this site possible, and allows Test Blog to continue to exist. Thank you!\"]]],[1,\"h3\",[[0,[],0,\"Access all areas\"]]],[1,\"p\",[[0,[],0,\"By signing up, you\'ll get access to the full archive of everything that\'s been published before and everything that\'s still to come. Your very own private library.\"]]],[1,\"h3\",[[0,[],0,\"Fresh content, delivered\"]]],[1,\"p\",[[0,[],0,\"Stay up to date with new content sent straight to your inbox! No more worrying about whether you missed something because of a pesky algorithm or news feed.\"]]],[1,\"h3\",[[0,[],0,\"Meet people like you\"]]],[1,\"p\",[[0,[],0,\"Join a community of other subscribers who share the same interests.\"]]],[10,0],[1,\"h3\",[[0,[],0,\"Start your own thing\"]]],[1,\"p\",[[0,[],0,\"Enjoying the experience? Get started for free and set up your very own subscription business using \"],[0,[0],1,\"Ghost\"],[0,[],0,\", the same platform that powers this website.\"]]]],\"ghostVersion\":\"4.0\"}',NULL,'<p>Test Blog is an independent publication launched in August 2025 by Test Admin. If you subscribe today, you\'ll get full access to the website as well as email newsletters about new content when it\'s available. Your subscription makes this site possible, and allows Test Blog to continue to exist. Thank you!</p><h3 id=\"access-all-areas\">Access all areas</h3><p>By signing up, you\'ll get access to the full archive of everything that\'s been published before and everything that\'s still to come. Your very own private library.</p><h3 id=\"fresh-content-delivered\">Fresh content, delivered</h3><p>Stay up to date with new content sent straight to your inbox! No more worrying about whether you missed something because of a pesky algorithm or news feed.</p><h3 id=\"meet-people-like-you\">Meet people like you</h3><p>Join a community of other subscribers who share the same interests.</p><hr><h3 id=\"start-your-own-thing\">Start your own thing</h3><p>Enjoying the experience? Get started for free and set up your very own subscription business using <a href=\"https://ghost.org\">Ghost</a>, the same platform that powers this website.</p>','6194d3ce51e2700162531a78','Test Blog is an independent publication launched in August 2025 by Test Admin. If you subscribe today, you\'ll get full access to the website as well as email newsletters about new content when it\'s available. Your subscription makes this site possible, and allows Test Blog to continue to exist. Thank you!\n\n\nAccess all areas\n\nBy signing up, you\'ll get access to the full archive of everything that\'s been published before and everything that\'s still to come. Your very own private library.\n\n\nFresh content, delivered\n\nStay up to date with new content sent straight to your inbox! No more worrying about whether you missed something because of a pesky algorithm or news feed.\n\n\nMeet people like you\n\nJoin a community of other subscribers who share the same interests.\n\n\nStart your own thing\n\nEnjoying the experience? Get started for free and set up your very own subscription business using Ghost, the same platform that powers this website.',NULL,0,'page','published',NULL,'public','all','2025-08-26 22:44:18','2025-08-26 22:44:20','2025-08-26 22:44:25','5951f5fc0000000000000000',NULL,NULL,NULL,NULL,NULL,NULL,1),('6194d3ce51e2700162531a79','0a58b1c9-dd62-4de3-8bc1-e777b822c1fd','Contact','contact','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"image\",{\"src\":\"https://static.ghost.org/v4.0.0/images/integrations.png\",\"width\":2944,\"height\":1716,\"href\":\"https://ghost.org/integrations/?tag=forms\"}]],\"markups\":[[\"a\",[\"href\",\"https://twitter.com/ghost\"]],[\"a\",[\"href\",\"https://www.facebook.com/ghost\"]],[\"a\",[\"href\",\"https://instagram.com/ghost\"]]],\"sections\":[[1,\"p\",[[0,[],0,\"If you want to set up a contact page for people to be able to reach out to you, the simplest way is to set up a simple page like this and list the different ways people can reach out to you.\"]]],[1,\"h3\",[[0,[],0,\"For example, here\'s how to reach us!\"]]],[3,\"ul\",[[[0,[0],1,\"@Ghost\"],[0,[],0,\" on Twitter\"]],[[0,[1],1,\"@Ghost\"],[0,[],0,\" on Facebook\"]],[[0,[2],1,\"@Ghost\"],[0,[],0,\" on Instagram\"]]]],[1,\"p\",[[0,[],0,\"If you prefer to use a contact form, almost all of the great embedded form services work great with Ghost and are easy to set up:\"]]],[10,0],[1,\"p\",[]]],\"ghostVersion\":\"4.0\"}',NULL,'<p>If you want to set up a contact page for people to be able to reach out to you, the simplest way is to set up a simple page like this and list the different ways people can reach out to you.</p><h3 id=\"for-example-heres-how-to-reach-us\">For example, here\'s how to reach us!</h3><ul><li><a href=\"https://twitter.com/ghost\">@Ghost</a> on Twitter</li><li><a href=\"https://www.facebook.com/ghost\">@Ghost</a> on Facebook</li><li><a href=\"https://instagram.com/ghost\">@Ghost</a> on Instagram</li></ul><p>If you prefer to use a contact form, almost all of the great embedded form services work great with Ghost and are easy to set up:</p><figure class=\"kg-card kg-image-card\"><a href=\"https://ghost.org/integrations/?tag=forms\"><img src=\"https://static.ghost.org/v4.0.0/images/integrations.png\" class=\"kg-image\" alt loading=\"lazy\" width=\"2944\" height=\"1716\"></a></figure>','6194d3ce51e2700162531a79','If you want to set up a contact page for people to be able to reach out to you, the simplest way is to set up a simple page like this and list the different ways people can reach out to you.\n\n\nFor example, here\'s how to reach us!\n\n * @Ghost on Twitter\n * @Ghost on Facebook\n * @Ghost on Instagram\n\nIf you prefer to use a contact form, almost all of the great embedded form services work great with Ghost and are easy to set up:',NULL,0,'page','published',NULL,'public','all','2025-08-26 22:44:18','2025-08-26 22:44:18','2025-08-26 22:44:26','5951f5fc0000000000000000',NULL,NULL,NULL,NULL,NULL,NULL,1),('6194d3ce51e2700162531a7a','5bda2cfe-73ed-4b5f-be3f-d03ff7dbbe6e','Privacy','privacy','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[],\"markups\":[],\"sections\":[[1,\"p\",[[0,[],0,\"Wondering how Ghost fares when it comes to privacy and GDPR rules? Good news: Ghost does not use any tracking cookies of any kind.\"]]],[1,\"p\",[[0,[],0,\"You can integrate any products, services, ads or integrations with Ghost yourself if you want to, but it\'s always a good idea to disclose how subscriber data will be used by putting together a privacy page.\"]]]],\"ghostVersion\":\"4.0\"}',NULL,'<p>Wondering how Ghost fares when it comes to privacy and GDPR rules? Good news: Ghost does not use any tracking cookies of any kind.</p><p>You can integrate any products, services, ads or integrations with Ghost yourself if you want to, but it\'s always a good idea to disclose how subscriber data will be used by putting together a privacy page.</p>','6194d3ce51e2700162531a7a','Wondering how Ghost fares when it comes to privacy and GDPR rules? Good news: Ghost does not use any tracking cookies of any kind.\n\nYou can integrate any products, services, ads or integrations with Ghost yourself if you want to, but it\'s always a good idea to disclose how subscriber data will be used by putting together a privacy page.',NULL,0,'page','published',NULL,'public','all','2025-08-26 22:44:18','2025-08-26 22:44:18','2025-08-26 22:44:27','5951f5fc0000000000000000',NULL,NULL,NULL,NULL,NULL,NULL,1),('6194d3ce51e2700162531a7b','0d524df7-1307-40fc-9443-e8117915cb4a','Contribute','contribute','{\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[],\"markups\":[[\"a\",[\"href\",\"https://github.com/tryghost\"]],[\"a\",[\"href\",\"https://github.com/sponsors/TryGhost\"]],[\"a\",[\"href\",\"https://opencollective.com/ghost\"]],[\"strong\"]],\"sections\":[[1,\"p\",[[0,[],0,\"Oh hey, you clicked every link of our starter content and even clicked this small link in the footer! If you like Ghost and you\'re enjoying the product so far, we\'d hugely appreciate your support in any way you care to show it.\"]]],[1,\"p\",[[0,[],0,\"Ghost is a non-profit organization, and we give away all our intellectual property as open source software. If you believe in what we do, there are a number of ways you can give us a hand, and we hugely appreciate all of them:\"]]],[3,\"ul\",[[[0,[],0,\"Contribute code via \"],[0,[0],1,\"GitHub\"]],[[0,[],0,\"Contribute financially via \"],[0,[1],1,\"GitHub Sponsors\"]],[[0,[],0,\"Contribute financially via \"],[0,[2],1,\"Open Collective\"]],[[0,[],0,\"Contribute reviews via \"],[0,[3],1,\"writing a blog post\"]],[[0,[],0,\"Contribute good vibes via \"],[0,[3],1,\"telling your friends\"],[0,[],0,\" about us\"]]]],[1,\"p\",[[0,[],0,\"Thanks for checking us out!\"]]]],\"ghostVersion\":\"4.0\"}',NULL,'<p>Oh hey, you clicked every link of our starter content and even clicked this small link in the footer! If you like Ghost and you\'re enjoying the product so far, we\'d hugely appreciate your support in any way you care to show it.</p><p>Ghost is a non-profit organization, and we give away all our intellectual property as open source software. If you believe in what we do, there are a number of ways you can give us a hand, and we hugely appreciate all of them:</p><ul><li>Contribute code via <a href=\"https://github.com/tryghost\">GitHub</a></li><li>Contribute financially via <a href=\"https://github.com/sponsors/TryGhost\">GitHub Sponsors</a></li><li>Contribute financially via <a href=\"https://opencollective.com/ghost\">Open Collective</a></li><li>Contribute reviews via <strong>writing a blog post</strong></li><li>Contribute good vibes via <strong>telling your friends</strong> about us</li></ul><p>Thanks for checking us out!</p>','6194d3ce51e2700162531a7b','Oh hey, you clicked every link of our starter content and even clicked this small link in the footer! If you like Ghost and you\'re enjoying the product so far, we\'d hugely appreciate your support in any way you care to show it.\n\nGhost is a non-profit organization, and we give away all our intellectual property as open source software. If you believe in what we do, there are a number of ways you can give us a hand, and we hugely appreciate all of them:\n\n * Contribute code via GitHub\n * Contribute financially via GitHub Sponsors\n * Contribute financially via Open Collective\n * Contribute reviews via writing a blog post\n * Contribute good vibes via telling your friends about us\n\nThanks for checking us out!',NULL,0,'page','published',NULL,'public','all','2025-08-26 22:44:18','2025-08-26 22:44:18','2025-08-26 22:44:28','5951f5fc0000000000000000',NULL,NULL,NULL,NULL,NULL,NULL,1);
/*!40000 ALTER TABLE `posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posts_authors`
--

DROP TABLE IF EXISTS `posts_authors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts_authors` (
  `id` varchar(24) NOT NULL,
  `post_id` varchar(24) NOT NULL,
  `author_id` varchar(24) NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `posts_authors_post_id_foreign` (`post_id`),
  KEY `posts_authors_author_id_foreign` (`author_id`),
  CONSTRAINT `posts_authors_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`),
  CONSTRAINT `posts_authors_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posts_authors`
--

LOCK TABLES `posts_authors` WRITE;
/*!40000 ALTER TABLE `posts_authors` DISABLE KEYS */;
INSERT INTO `posts_authors` VALUES ('68ae38c239f9d451fc955134','6194d3ce51e2700162531a71','5951f5fca366002ebd5dbef7',0),('68ae38c239f9d451fc955135','6194d3ce51e2700162531a72','5951f5fca366002ebd5dbef7',0),('68ae38c239f9d451fc955136','6194d3ce51e2700162531a73','5951f5fca366002ebd5dbef7',0),('68ae38c239f9d451fc955137','6194d3ce51e2700162531a74','5951f5fca366002ebd5dbef7',0),('68ae38c239f9d451fc955138','6194d3ce51e2700162531a75','5951f5fca366002ebd5dbef7',0),('68ae38c239f9d451fc955139','6194d3ce51e2700162531a76','5951f5fca366002ebd5dbef7',0),('68ae38c239f9d451fc95513a','6194d3ce51e2700162531a77','5951f5fca366002ebd5dbef7',0),('68ae38c239f9d451fc95513b','6194d3ce51e2700162531a78','5951f5fca366002ebd5dbef7',0),('68ae38c239f9d451fc95513c','6194d3ce51e2700162531a79','5951f5fca366002ebd5dbef7',0),('68ae38c239f9d451fc95513d','6194d3ce51e2700162531a7a','5951f5fca366002ebd5dbef7',0),('68ae38c239f9d451fc95513e','6194d3ce51e2700162531a7b','5951f5fca366002ebd5dbef7',0);
/*!40000 ALTER TABLE `posts_authors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posts_meta`
--

DROP TABLE IF EXISTS `posts_meta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts_meta` (
  `id` varchar(24) NOT NULL,
  `post_id` varchar(24) NOT NULL,
  `og_image` varchar(2000) DEFAULT NULL,
  `og_title` varchar(300) DEFAULT NULL,
  `og_description` varchar(500) DEFAULT NULL,
  `twitter_image` varchar(2000) DEFAULT NULL,
  `twitter_title` varchar(300) DEFAULT NULL,
  `twitter_description` varchar(500) DEFAULT NULL,
  `meta_title` varchar(2000) DEFAULT NULL,
  `meta_description` varchar(2000) DEFAULT NULL,
  `email_subject` varchar(300) DEFAULT NULL,
  `frontmatter` text,
  `feature_image_alt` varchar(2000) DEFAULT NULL,
  `feature_image_caption` text,
  `email_only` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `posts_meta_post_id_unique` (`post_id`),
  CONSTRAINT `posts_meta_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posts_meta`
--

LOCK TABLES `posts_meta` WRITE;
/*!40000 ALTER TABLE `posts_meta` DISABLE KEYS */;
/*!40000 ALTER TABLE `posts_meta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posts_products`
--

DROP TABLE IF EXISTS `posts_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts_products` (
  `id` varchar(24) NOT NULL,
  `post_id` varchar(24) NOT NULL,
  `product_id` varchar(24) NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `posts_products_post_id_foreign` (`post_id`),
  KEY `posts_products_product_id_foreign` (`product_id`),
  CONSTRAINT `posts_products_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `posts_products_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posts_products`
--

LOCK TABLES `posts_products` WRITE;
/*!40000 ALTER TABLE `posts_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `posts_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posts_tags`
--

DROP TABLE IF EXISTS `posts_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts_tags` (
  `id` varchar(24) NOT NULL,
  `post_id` varchar(24) NOT NULL,
  `tag_id` varchar(24) NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `posts_tags_tag_id_foreign` (`tag_id`),
  KEY `posts_tags_post_id_tag_id_index` (`post_id`,`tag_id`),
  CONSTRAINT `posts_tags_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`),
  CONSTRAINT `posts_tags_tag_id_foreign` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posts_tags`
--

LOCK TABLES `posts_tags` WRITE;
/*!40000 ALTER TABLE `posts_tags` DISABLE KEYS */;
INSERT INTO `posts_tags` VALUES ('68ae38c239f9d451fc9552e6','6194d3ce51e2700162531a71','6194d3ce51e2700162531a70',0),('68ae38c239f9d451fc9552e7','6194d3ce51e2700162531a72','6194d3ce51e2700162531a70',0),('68ae38c239f9d451fc9552e8','6194d3ce51e2700162531a76','6194d3ce51e2700162531a70',0),('68ae38c239f9d451fc9552e9','6194d3ce51e2700162531a75','6194d3ce51e2700162531a70',0),('68ae38c239f9d451fc9552ea','6194d3ce51e2700162531a77','6194d3ce51e2700162531a70',0),('68ae38c239f9d451fc9552eb','6194d3ce51e2700162531a74','6194d3ce51e2700162531a70',0),('68ae38c239f9d451fc9552ec','6194d3ce51e2700162531a73','6194d3ce51e2700162531a70',0);
/*!40000 ALTER TABLE `posts_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` varchar(24) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `welcome_page_url` varchar(2000) DEFAULT NULL,
  `visibility` varchar(50) NOT NULL DEFAULT 'none',
  `trial_days` int unsigned NOT NULL DEFAULT '0',
  `description` varchar(191) DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'paid',
  `currency` varchar(50) DEFAULT NULL,
  `monthly_price` int unsigned DEFAULT NULL,
  `yearly_price` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `monthly_price_id` varchar(24) DEFAULT NULL,
  `yearly_price_id` varchar(24) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES ('68ae38c239f9d451fc9550b9','Test Blog','default-product',1,NULL,'public',0,NULL,'paid','USD',500,5000,'2025-08-26 22:44:18','2025-08-26 22:44:20',NULL,NULL),('68ae38c239f9d451fc9550ba','Free','free',1,NULL,'public',0,NULL,'free',NULL,NULL,NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18',NULL,NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products_benefits`
--

DROP TABLE IF EXISTS `products_benefits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products_benefits` (
  `id` varchar(24) NOT NULL,
  `product_id` varchar(24) NOT NULL,
  `benefit_id` varchar(24) NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `products_benefits_product_id_foreign` (`product_id`),
  KEY `products_benefits_benefit_id_foreign` (`benefit_id`),
  CONSTRAINT `products_benefits_benefit_id_foreign` FOREIGN KEY (`benefit_id`) REFERENCES `benefits` (`id`) ON DELETE CASCADE,
  CONSTRAINT `products_benefits_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products_benefits`
--

LOCK TABLES `products_benefits` WRITE;
/*!40000 ALTER TABLE `products_benefits` DISABLE KEYS */;
/*!40000 ALTER TABLE `products_benefits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recommendation_click_events`
--

DROP TABLE IF EXISTS `recommendation_click_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recommendation_click_events` (
  `id` varchar(24) NOT NULL,
  `recommendation_id` varchar(24) NOT NULL,
  `member_id` varchar(24) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `recommendation_click_events_recommendation_id_foreign` (`recommendation_id`),
  KEY `recommendation_click_events_member_id_foreign` (`member_id`),
  CONSTRAINT `recommendation_click_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL,
  CONSTRAINT `recommendation_click_events_recommendation_id_foreign` FOREIGN KEY (`recommendation_id`) REFERENCES `recommendations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recommendation_click_events`
--

LOCK TABLES `recommendation_click_events` WRITE;
/*!40000 ALTER TABLE `recommendation_click_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `recommendation_click_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recommendation_subscribe_events`
--

DROP TABLE IF EXISTS `recommendation_subscribe_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recommendation_subscribe_events` (
  `id` varchar(24) NOT NULL,
  `recommendation_id` varchar(24) NOT NULL,
  `member_id` varchar(24) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `recommendation_subscribe_events_recommendation_id_foreign` (`recommendation_id`),
  KEY `recommendation_subscribe_events_member_id_foreign` (`member_id`),
  CONSTRAINT `recommendation_subscribe_events_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL,
  CONSTRAINT `recommendation_subscribe_events_recommendation_id_foreign` FOREIGN KEY (`recommendation_id`) REFERENCES `recommendations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recommendation_subscribe_events`
--

LOCK TABLES `recommendation_subscribe_events` WRITE;
/*!40000 ALTER TABLE `recommendation_subscribe_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `recommendation_subscribe_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recommendations`
--

DROP TABLE IF EXISTS `recommendations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recommendations` (
  `id` varchar(24) NOT NULL,
  `url` varchar(2000) NOT NULL,
  `title` varchar(2000) NOT NULL,
  `excerpt` varchar(2000) DEFAULT NULL,
  `featured_image` varchar(2000) DEFAULT NULL,
  `favicon` varchar(2000) DEFAULT NULL,
  `description` varchar(2000) DEFAULT NULL,
  `one_click_subscribe` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recommendations`
--

LOCK TABLES `recommendations` WRITE;
/*!40000 ALTER TABLE `recommendations` DISABLE KEYS */;
/*!40000 ALTER TABLE `recommendations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `redirects`
--

DROP TABLE IF EXISTS `redirects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `redirects` (
  `id` varchar(24) NOT NULL,
  `from` varchar(191) NOT NULL,
  `to` varchar(2000) NOT NULL,
  `post_id` varchar(24) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `redirects_from_index` (`from`),
  KEY `redirects_post_id_foreign` (`post_id`),
  CONSTRAINT `redirects_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `redirects`
--

LOCK TABLES `redirects` WRITE;
/*!40000 ALTER TABLE `redirects` DISABLE KEYS */;
/*!40000 ALTER TABLE `redirects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` varchar(24) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(2000) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('68ae38c139f9d451fc9550aa','Administrator','Administrators','2025-08-26 22:44:17','2025-08-26 22:44:17'),('68ae38c139f9d451fc9550ab','Editor','Editors','2025-08-26 22:44:17','2025-08-26 22:44:17'),('68ae38c139f9d451fc9550ac','Author','Authors','2025-08-26 22:44:17','2025-08-26 22:44:17'),('68ae38c139f9d451fc9550ad','Contributor','Contributors','2025-08-26 22:44:17','2025-08-26 22:44:17'),('68ae38c139f9d451fc9550ae','Owner','Blog Owner','2025-08-26 22:44:17','2025-08-26 22:44:17'),('68ae38c139f9d451fc9550af','Admin Integration','External Apps','2025-08-26 22:44:17','2025-08-26 22:44:17'),('68ae38c139f9d451fc9550b0','Ghost Explore Integration','Internal Integration for the Ghost Explore directory','2025-08-26 22:44:17','2025-08-26 22:44:17'),('68ae38c139f9d451fc9550b1','Self-Serve Migration Integration','Internal Integration for the Self-Serve migration tool','2025-08-26 22:44:17','2025-08-26 22:44:17'),('68ae38c139f9d451fc9550b2','DB Backup Integration','Internal DB Backup Client','2025-08-26 22:44:17','2025-08-26 22:44:17'),('68ae38c139f9d451fc9550b3','Scheduler Integration','Internal Scheduler Client','2025-08-26 22:44:17','2025-08-26 22:44:17'),('68ae38c139f9d451fc9550b4','Super Editor','Super Editor','2025-08-26 22:44:17','2025-08-26 22:44:17');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles_users`
--

DROP TABLE IF EXISTS `roles_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles_users` (
  `id` varchar(24) NOT NULL,
  `role_id` varchar(24) NOT NULL,
  `user_id` varchar(24) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles_users`
--

LOCK TABLES `roles_users` WRITE;
/*!40000 ALTER TABLE `roles_users` DISABLE KEYS */;
INSERT INTO `roles_users` VALUES ('68ae38c239f9d451fc9550b5','68ae38c139f9d451fc9550ad','5951f5fca366002ebd5dbef7'),('68ae38c239f9d451fc9550b6','68ae38c139f9d451fc9550ae','5951f5fc0000000000000000');
/*!40000 ALTER TABLE `roles_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(24) NOT NULL,
  `session_id` varchar(32) NOT NULL,
  `user_id` varchar(24) NOT NULL,
  `session_data` varchar(2000) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessions_session_id_unique` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` varchar(24) NOT NULL,
  `group` varchar(50) NOT NULL DEFAULT 'core',
  `key` varchar(50) NOT NULL,
  `value` text,
  `type` varchar(50) NOT NULL,
  `flags` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('68ae38c239f9d451fc9552f4','core','last_mentions_report_email_timestamp',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9552f5','core','db_hash','ce96ccb2-c233-4b68-8ce5-f6a2a6b101c7','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9552f6','core','routes_hash','3d180d52c663d173a6be791ef411ed01','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:19'),('68ae38c239f9d451fc9552f7','core','next_update_check',NULL,'number',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9552f8','core','notifications','[]','array',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9552f9','core','version_notifications','[]','array',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9552fa','core','admin_session_secret','166b6c0df22b4a6543a684f2fb93a58cacab08f88bfbc02a503c74af97e27ad7','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9552fb','core','theme_session_secret','e03cf9c4ffec929c79e7e9018a9dc98b60373926bdc5c837d689a22250c89dc4','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9552fc','core','ghost_public_key','-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBAJ23jHApwBPsFAu6wZolFc2tKWW95Fj8PAdmm3EWKWDmQzuHAZvuWydGrgWmC68A\nF/G3wSnZV7klWKkMzTqb3nKW5s99y+KqI9Jj9f/hT2dpEpgARoa1K8aJGlh7Tw382P/CCEFf\n52t+Vu+9dJYv+Kwa0hN9hIX4GjlzhpwXr027AgMBAAE=\n-----END RSA PUBLIC KEY-----\n','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9552fd','core','ghost_private_key','-----BEGIN RSA PRIVATE KEY-----\nMIICXAIBAAKBgQCdt4xwKcAT7BQLusGaJRXNrSllveRY/DwHZptxFilg5kM7hwGb7lsnRq4F\npguvABfxt8Ep2Ve5JVipDM06m95ylubPfcviqiPSY/X/4U9naRKYAEaGtSvGiRpYe08N/Nj/\nwghBX+drflbvvXSWL/isGtITfYSF+Bo5c4acF69NuwIDAQABAoGAOBCkksa0qiBU6+qCogom\n2wuAWNONFfjsWfEmtqebJAAWzFVsxAKSUr70Y7uoEZil6l5ZA0hov78/6jBL0FbSVzgFnq3J\nhbyP5ERQsFJwMHGIuMDdD6/vWPH8E677xOrwH/GuJOAMK7dOGCutMSZtD1WOL0hWN3iJutmo\nv2jU9akCQQDgUOrVj3411j9qp+CKwpGBFELKBlR36SlLMXqtPnhRCZCL1bIRbC4D2e9VfDwy\nh+xB/x2RsbGj/zhf5S0GcHr9AkEAs/52oqxqMHxgTaz37om6JCdnpO3rQ61Y47RYSFRMD+eI\nmO214p4N79N0RZU/b1WWn0hJe7lWjnEB2kOMCauVFwJBAIZ2Wt6bfmddP3R6n3HuQfRjJcoe\nU0Hx5UvqpAP3f33sQtZfybcB5u9uEzZmG1ua+Ldy6tGr97U7xxpMsVm70S0CQBnpqXSz87m1\nPjwQicUaqOSpk59H7VXZ7/EgNpF7KVQk1iKGHmhYrtL3E0ctPGuv27ZktseMICzzkfu1O8Ts\nodMCQCspv14K3gnNOx4zYe/iFaLZexWp8vjBOoSvZiWKmMiUmf4Xu1tlktFdVlIZQPPsLlm2\na1PYnkz+Ss6+AMH5y7A=\n-----END RSA PRIVATE KEY-----\n','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9552fe','core','members_public_key','-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBAJoZFRhsKCofQFGgasgkfFK1l6SDNkNhp/kpBlZARM8EJPFD4z2qtEp6cSvJAHxs\nG1V5Wdu+V1MtFLl6h/kYMff9IesyvrJd9haQB+DVxtOIVoFPey71ITCgCYaYj7Il69EsgSp+\n6MGj5iQQQ+EG3PwIVakjrqx574j3jH+gTCDZAgMBAAE=\n-----END RSA PUBLIC KEY-----\n','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc9552ff','core','members_private_key','-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgQCaGRUYbCgqH0BRoGrIJHxStZekgzZDYaf5KQZWQETPBCTxQ+M9qrRKenEr\nyQB8bBtVeVnbvldTLRS5eof5GDH3/SHrMr6yXfYWkAfg1cbTiFaBT3su9SEwoAmGmI+yJevR\nLIEqfujBo+YkEEPhBtz8CFWpI66see+I94x/oEwg2QIDAQABAoGAUpcA5G8Lc8/+FAGrWYuc\nimPDW6vriF+tvG/NcqrNdjqdZiXhhCqaqJRJVZNMTGNQnxYEIC869FxkECjo+YuLM65yR8KD\n+YFA/mUL3u5j9Nj1AXd3OpTaev12fMt8flqoTRqRQPcbgvj12HgSqa7fSqxApFKHnBnfABku\nR8OGJ/UCQQDQj6shD8zouNvbpVln9/3ckbUTvBd13KhIYFhqy+jh8Mjy37NoB3rUZ0UDDEEe\nlSdJ5Cb1YzjqPXjrS/PJjz+7AkEAvSYRtcBFeMcTHVG60Qf1UTS4b18TcbujbuvnCc1sJHRA\njLqTnsm0r1G7ZAqT5HRWINyZFExK0QMdmGyl2/xmewJASqeSpyQDwi4hrO70IO45NdIGUkka\n0LqqljW+kIPrGa1aEO4YRx2eTxekMWIakTrstFtxwpbA0cAtX3RxkG2xbwJAUc93dX82DSk9\nsT66aNLiXj9JTpJ23IhmBgHuqiS5k4LcsIG6e8GObw4Q2RJiKTvQTOJdK5Rb/88zK8xCaMXg\npQJAAfp46yxLcVyV5MR1WHdva3gsSF62twtrZBoL3SK0KDNl3TtGm46mVP3BvgYX+v/R3JFr\n/dFWQmV6+p4vwTK2jQ==\n-----END RSA PRIVATE KEY-----\n','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955300','core','members_email_auth_secret','31eba51c3093bd30a224766358c2abfc47d50cddc0fefbb4757cc675f9ec8b1a3f891887ebb5b4964a2d621e332add1b362f879a063052770654503f13612934','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955301','core','members_stripe_webhook_id',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955302','core','members_stripe_webhook_secret',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955303','members','members_track_sources','true','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955304','core','site_uuid','5b640489-fa24-445f-ae45-333a1e3cd9a1','string','PUBLIC,RO','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955305','site','title','Test Blog','string','PUBLIC','2025-08-26 22:44:18','2025-08-26 22:44:20'),('68ae38c239f9d451fc955306','site','description','Thoughts, stories and ideas.','string','PUBLIC','2025-08-26 22:44:18','2025-08-26 22:44:20'),('68ae38c239f9d451fc955307','site','logo','','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955308','site','cover_image','https://static.ghost.org/v5.0.0/images/publication-cover.jpg','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955309','site','icon','','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95530a','site','accent_color','#FF1A75','string','PUBLIC','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95530b','site','locale','en','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95530c','site','timezone','Etc/UTC','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95530d','site','codeinjection_head','','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95530e','site','codeinjection_foot','','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95530f','site','facebook','ghost','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955310','site','twitter','@ghost','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955311','site','navigation','[{\"label\":\"Home\",\"url\":\"/\"},{\"label\":\"About\",\"url\":\"/about/\"},{\"label\":\"Collection\",\"url\":\"/tag/getting-started/\"},{\"label\":\"Author\",\"url\":\"/author/ghost/\"},{\"label\":\"Portal\",\"url\":\"/portal/\"}]','array',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955312','site','secondary_navigation','[{\"label\":\"Data & privacy\",\"url\":\"/privacy/\"},{\"label\":\"Contact\",\"url\":\"/contact/\"},{\"label\":\"Contribute →\",\"url\":\"/contribute/\"}]','array',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955313','site','meta_title',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955314','site','meta_description',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955315','site','og_image',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955316','site','og_title',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955317','site','og_description',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955318','site','twitter_image',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955319','site','twitter_title',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95531a','site','twitter_description',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95531b','theme','active_theme','source','string','RO','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95531c','private','is_private','false','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95531d','private','password','','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95531e','private','public_hash','591d9f5206ebea1e295d5ceadee4c8','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95531f','members','default_content_visibility','public','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955320','members','default_content_visibility_tiers','[]','array',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955321','members','members_signup_access','all','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955322','members','members_support_address','noreply','string','PUBLIC,RO','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955323','members','stripe_secret_key',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955324','members','stripe_publishable_key',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955325','members','stripe_plans','[]','array',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955326','members','stripe_connect_publishable_key','pk_test_for_stripe','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955327','members','stripe_connect_secret_key','sk_test_for_stripe','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955328','members','stripe_connect_livemode',NULL,'boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955329','members','stripe_connect_display_name',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95532a','members','stripe_connect_account_id',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95532b','members','members_monthly_price_id',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95532c','members','members_yearly_price_id',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95532d','portal','portal_name','true','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95532e','portal','portal_button','true','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95532f','portal','portal_plans','[\"free\"]','array',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955330','portal','portal_default_plan','yearly','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955331','portal','portal_products','[]','array',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955332','portal','portal_button_style','icon-and-text','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955333','portal','portal_button_icon',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955334','portal','portal_button_signup_text','Subscribe','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955335','portal','portal_signup_terms_html',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955336','portal','portal_signup_checkbox_required','false','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955337','email','mailgun_domain',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955338','email','mailgun_api_key',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955339','email','mailgun_base_url',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95533a','email','email_track_opens','true','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95533b','email','email_track_clicks','true','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95533c','email','email_verification_required','false','boolean','RO','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95533d','firstpromoter','firstpromoter','false','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95533e','firstpromoter','firstpromoter_id',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95533f','labs','labs','{}','object',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955340','slack','slack_url','','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955341','slack','slack_username','Ghost','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955342','unsplash','unsplash','true','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955343','views','shared_views','[]','array',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955344','editor','editor_default_email_recipients','visibility','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955345','editor','editor_default_email_recipients_filter','all','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955346','announcement','announcement_content',NULL,'string','PUBLIC','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955347','announcement','announcement_visibility','[]','array',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955348','announcement','announcement_background','dark','string','PUBLIC','2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955349','comments','comments_enabled','off','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95534a','analytics','outbound_link_tagging','true','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95534b','analytics','web_analytics','true','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95534c','pintura','pintura','true','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95534d','pintura','pintura_js_url',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95534e','pintura','pintura_css_url',NULL,'string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc95534f','donations','donations_currency','USD','string',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955350','donations','donations_suggested_amount','500','number',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955351','recommendations','recommendations_enabled','false','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955352','explore','explore_ping','true','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18'),('68ae38c239f9d451fc955353','explore','explore_ping_growth','false','boolean',NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `snippets`
--

DROP TABLE IF EXISTS `snippets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `snippets` (
  `id` varchar(24) NOT NULL,
  `name` varchar(191) NOT NULL,
  `mobiledoc` longtext NOT NULL,
  `lexical` longtext,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `snippets_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `snippets`
--

LOCK TABLES `snippets` WRITE;
/*!40000 ALTER TABLE `snippets` DISABLE KEYS */;
/*!40000 ALTER TABLE `snippets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stripe_prices`
--

DROP TABLE IF EXISTS `stripe_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stripe_prices` (
  `id` varchar(24) NOT NULL,
  `stripe_price_id` varchar(255) NOT NULL,
  `stripe_product_id` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL,
  `nickname` varchar(255) DEFAULT NULL,
  `currency` varchar(191) NOT NULL,
  `amount` int NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'recurring',
  `interval` varchar(50) DEFAULT NULL,
  `description` varchar(191) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stripe_prices_stripe_price_id_unique` (`stripe_price_id`),
  KEY `stripe_prices_stripe_product_id_foreign` (`stripe_product_id`),
  CONSTRAINT `stripe_prices_stripe_product_id_foreign` FOREIGN KEY (`stripe_product_id`) REFERENCES `stripe_products` (`stripe_product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stripe_prices`
--

LOCK TABLES `stripe_prices` WRITE;
/*!40000 ALTER TABLE `stripe_prices` DISABLE KEYS */;
/*!40000 ALTER TABLE `stripe_prices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stripe_products`
--

DROP TABLE IF EXISTS `stripe_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stripe_products` (
  `id` varchar(24) NOT NULL,
  `product_id` varchar(24) DEFAULT NULL,
  `stripe_product_id` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stripe_products_stripe_product_id_unique` (`stripe_product_id`),
  KEY `stripe_products_product_id_foreign` (`product_id`),
  CONSTRAINT `stripe_products_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stripe_products`
--

LOCK TABLES `stripe_products` WRITE;
/*!40000 ALTER TABLE `stripe_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `stripe_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` varchar(24) NOT NULL,
  `type` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL,
  `member_id` varchar(24) NOT NULL,
  `tier_id` varchar(24) NOT NULL,
  `cadence` varchar(50) DEFAULT NULL,
  `currency` varchar(50) DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `payment_provider` varchar(50) DEFAULT NULL,
  `payment_subscription_url` varchar(2000) DEFAULT NULL,
  `payment_user_url` varchar(2000) DEFAULT NULL,
  `offer_id` varchar(24) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscriptions_member_id_foreign` (`member_id`),
  KEY `subscriptions_tier_id_foreign` (`tier_id`),
  KEY `subscriptions_offer_id_foreign` (`offer_id`),
  CONSTRAINT `subscriptions_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subscriptions_offer_id_foreign` FOREIGN KEY (`offer_id`) REFERENCES `offers` (`id`),
  CONSTRAINT `subscriptions_tier_id_foreign` FOREIGN KEY (`tier_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppressions`
--

DROP TABLE IF EXISTS `suppressions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppressions` (
  `id` varchar(24) NOT NULL,
  `email` varchar(191) NOT NULL,
  `email_id` varchar(24) DEFAULT NULL,
  `reason` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `suppressions_email_unique` (`email`),
  KEY `suppressions_email_id_foreign` (`email_id`),
  CONSTRAINT `suppressions_email_id_foreign` FOREIGN KEY (`email_id`) REFERENCES `emails` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppressions`
--

LOCK TABLES `suppressions` WRITE;
/*!40000 ALTER TABLE `suppressions` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppressions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `id` varchar(24) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` text,
  `feature_image` varchar(2000) DEFAULT NULL,
  `parent_id` varchar(191) DEFAULT NULL,
  `visibility` varchar(50) NOT NULL DEFAULT 'public',
  `og_image` varchar(2000) DEFAULT NULL,
  `og_title` varchar(300) DEFAULT NULL,
  `og_description` varchar(500) DEFAULT NULL,
  `twitter_image` varchar(2000) DEFAULT NULL,
  `twitter_title` varchar(300) DEFAULT NULL,
  `twitter_description` varchar(500) DEFAULT NULL,
  `meta_title` varchar(2000) DEFAULT NULL,
  `meta_description` varchar(2000) DEFAULT NULL,
  `codeinjection_head` text,
  `codeinjection_foot` text,
  `canonical_url` varchar(2000) DEFAULT NULL,
  `accent_color` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tags_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tags`
--

LOCK TABLES `tags` WRITE;
/*!40000 ALTER TABLE `tags` DISABLE KEYS */;
INSERT INTO `tags` VALUES ('6194d3ce51e2700162531a70','Getting Started','getting-started',NULL,NULL,NULL,'public',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-26 22:44:18','2025-08-26 22:44:18');
/*!40000 ALTER TABLE `tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tokens`
--

DROP TABLE IF EXISTS `tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens` (
  `id` varchar(24) NOT NULL,
  `token` varchar(32) NOT NULL,
  `data` varchar(2000) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `first_used_at` datetime DEFAULT NULL,
  `used_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `tokens_token_index` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tokens`
--

LOCK TABLES `tokens` WRITE;
/*!40000 ALTER TABLE `tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(24) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `password` varchar(60) NOT NULL,
  `email` varchar(191) NOT NULL,
  `profile_image` varchar(2000) DEFAULT NULL,
  `cover_image` varchar(2000) DEFAULT NULL,
  `bio` text,
  `website` varchar(2000) DEFAULT NULL,
  `location` text,
  `facebook` varchar(2000) DEFAULT NULL,
  `twitter` varchar(2000) DEFAULT NULL,
  `threads` varchar(191) DEFAULT NULL,
  `bluesky` varchar(191) DEFAULT NULL,
  `mastodon` varchar(191) DEFAULT NULL,
  `tiktok` varchar(191) DEFAULT NULL,
  `youtube` varchar(191) DEFAULT NULL,
  `instagram` varchar(191) DEFAULT NULL,
  `linkedin` varchar(191) DEFAULT NULL,
  `accessibility` text,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `locale` varchar(6) DEFAULT NULL,
  `visibility` varchar(50) NOT NULL DEFAULT 'public',
  `meta_title` varchar(2000) DEFAULT NULL,
  `meta_description` varchar(2000) DEFAULT NULL,
  `tour` text,
  `last_seen` datetime DEFAULT NULL,
  `comment_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `free_member_signup_notification` tinyint(1) NOT NULL DEFAULT '1',
  `paid_subscription_started_notification` tinyint(1) NOT NULL DEFAULT '1',
  `paid_subscription_canceled_notification` tinyint(1) NOT NULL DEFAULT '0',
  `mention_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `recommendation_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `milestone_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `donation_notifications` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_slug_unique` (`slug`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('5951f5fc0000000000000000','Test Admin','test','$2a$04$rmaLJJ2Ut0Z.fBW4N5faK.Otu2BAW9aKDQiwdxKEc7ZmMDDyQr4ay','test@ghost.org',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'active',NULL,'public',NULL,NULL,NULL,NULL,1,1,1,0,1,1,1,1,'2025-08-26 22:44:17','2025-08-26 22:44:20'),('5951f5fca366002ebd5dbef7','Ghost','ghost','$2a$04$295uDLBUPswBltuI56Y3Gu5jSr2N2OSXjKieL7LNVv8tli.QvM.06','ghost-author@example.com','https://static.ghost.org/v4.0.0/images/ghost-user.png',NULL,'You can delete this user to remove all the welcome posts','https://ghost.org','The Internet','ghost','ghost',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'active',NULL,'public',NULL,NULL,NULL,NULL,1,1,1,0,1,1,1,1,'2025-08-26 22:44:18','2025-08-26 22:44:18');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhooks`
--

DROP TABLE IF EXISTS `webhooks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhooks` (
  `id` varchar(24) NOT NULL,
  `event` varchar(50) NOT NULL,
  `target_url` varchar(2000) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  `secret` varchar(191) DEFAULT NULL,
  `api_version` varchar(50) NOT NULL DEFAULT 'v2',
  `integration_id` varchar(24) NOT NULL,
  `last_triggered_at` datetime DEFAULT NULL,
  `last_triggered_status` varchar(50) DEFAULT NULL,
  `last_triggered_error` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `webhooks_integration_id_foreign` (`integration_id`),
  CONSTRAINT `webhooks_integration_id_foreign` FOREIGN KEY (`integration_id`) REFERENCES `integrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhooks`
--

LOCK TABLES `webhooks` WRITE;
/*!40000 ALTER TABLE `webhooks` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhooks` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-26 17:44:20
