-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar_url" TEXT,
    "wechat_id" TEXT,
    "biz" TEXT,
    "reserved_fields" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "news_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author_name" TEXT,
    "publish_time" TIMESTAMP(3),
    "raw_content" JSONB NOT NULL,
    "markdown_content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "extraction_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dimension_templates" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "prompt_template" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "model_preference" TEXT NOT NULL DEFAULT 'haiku',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dimension_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_results" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "extracted_data" JSONB NOT NULL,
    "model_used" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "extraction_time" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extraction_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "description" TEXT,
    "base_url" TEXT,
    "api_key" TEXT NOT NULL,
    "max_tokens" INTEGER NOT NULL DEFAULT 4096,
    "temperature" DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "official_accounts_user_id_idx" ON "official_accounts"("user_id");

-- CreateIndex
CREATE INDEX "official_accounts_name_idx" ON "official_accounts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "articles_url_key" ON "articles"("url");

-- CreateIndex
CREATE INDEX "articles_account_id_idx" ON "articles"("account_id");

-- CreateIndex
CREATE INDEX "articles_news_id_idx" ON "articles"("news_id");

-- CreateIndex
CREATE INDEX "articles_status_idx" ON "articles"("status");

-- CreateIndex
CREATE INDEX "articles_publish_time_idx" ON "articles"("publish_time");

-- CreateIndex
CREATE INDEX "dimension_templates_account_id_idx" ON "dimension_templates"("account_id");

-- CreateIndex
CREATE INDEX "dimension_templates_is_locked_idx" ON "dimension_templates"("is_locked");

-- CreateIndex
CREATE INDEX "extraction_results_article_id_idx" ON "extraction_results"("article_id");

-- CreateIndex
CREATE INDEX "extraction_results_template_id_idx" ON "extraction_results"("template_id");

-- CreateIndex
CREATE INDEX "extraction_results_created_at_idx" ON "extraction_results"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "extraction_results_article_id_template_id_key" ON "extraction_results"("article_id", "template_id");

-- CreateIndex
CREATE INDEX "model_configs_is_active_idx" ON "model_configs"("is_active");

-- AddForeignKey
ALTER TABLE "official_accounts" ADD CONSTRAINT "official_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "official_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dimension_templates" ADD CONSTRAINT "dimension_templates_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "official_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "dimension_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
