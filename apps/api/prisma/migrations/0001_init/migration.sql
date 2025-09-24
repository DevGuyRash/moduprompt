-- Create Snippet table
CREATE TABLE "Snippet" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "frontmatter" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "headRev" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Snippet_path_idx" ON "Snippet" ("path");

-- Create SnippetVersion table
CREATE TABLE "SnippetVersion" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "snippetId" TEXT NOT NULL,
  "rev" INTEGER NOT NULL,
  "parentRev" INTEGER,
  "authorId" TEXT,
  "authorName" TEXT,
  "authorEmail" TEXT,
  "note" TEXT,
  "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "body" TEXT NOT NULL,
  "frontmatter" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  CONSTRAINT "SnippetVersion_snippetId_fkey" FOREIGN KEY ("snippetId") REFERENCES "Snippet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SnippetVersion_snippetId_rev_key" ON "SnippetVersion" ("snippetId", "rev");
CREATE INDEX "SnippetVersion_snippetId_idx" ON "SnippetVersion" ("snippetId");

-- Create Document table
CREATE TABLE "Document" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "blocks" TEXT NOT NULL,
  "edges" TEXT NOT NULL,
  "variables" TEXT NOT NULL,
  "exportRecipes" TEXT NOT NULL,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "statusKey" TEXT NOT NULL,
  "settings" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Document_statusKey_idx" ON "Document" ("statusKey");

-- Create ExportRecipe table
CREATE TABLE "ExportRecipe" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "include" TEXT NOT NULL,
  "theme" TEXT,
  "pdf" TEXT,
  "allowedStatuses" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create ExportJob table
CREATE TABLE "ExportJob" (
  "id" TEXT PRIMARY KEY,
  "documentId" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "artifactUri" TEXT,
  "error" TEXT,
  "metadata" TEXT,
  "requestedBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
  CONSTRAINT "ExportJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExportJob_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "ExportRecipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ExportJob_documentId_idx" ON "ExportJob" ("documentId");
CREATE INDEX "ExportJob_recipeId_idx" ON "ExportJob" ("recipeId");

-- Create WorkspaceStatus table
CREATE TABLE "WorkspaceStatus" (
  "key" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER,
  "isFinal" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create WebhookSubscription table
CREATE TABLE "WebhookSubscription" (
  "id" TEXT PRIMARY KEY,
  "url" TEXT NOT NULL,
  "secret" TEXT,
  "events" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disabledAt" DATETIME
);

-- Create AuditLogEntry table
CREATE TABLE "AuditLogEntry" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "metadata" TEXT NOT NULL,
  "actorId" TEXT,
  "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create PluginRegistry table
CREATE TABLE "PluginRegistry" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "manifest" TEXT NOT NULL,
  "enabled" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "PluginRegistry_name_version_kind_key" ON "PluginRegistry" ("name", "version", "kind");
