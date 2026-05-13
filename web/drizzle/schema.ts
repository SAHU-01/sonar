/**
 * Drizzle ORM schema for Sonar's Postgres database.
 * Tables: forms, submissions, batches, admin_notes, tags, submission_tags, analytics_events.
 */
import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core';

export const forms = pgTable('forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  suiObjectId: text('sui_object_id'),
  ownerWallet: text('owner_wallet').notNull(),
  title: text('title').notNull(),
  currentBlobId: text('current_blob_id'),
  version: integer('version').notNull().default(1),
  encrypted: boolean('encrypted').notNull().default(false),
  policyPackageId: text('policy_package_id'),
  slug: text('slug').unique(),
  status: text('status').notNull().default('draft'), // draft, published, archived
  schema: jsonb('schema'), // full FormSchemaType JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').references(() => forms.id).notNull(),
  formVersion: integer('form_version').notNull(),
  data: jsonb('data').notNull(),
  encrypted: boolean('encrypted').notNull().default(false),
  encryptedBlob: text('encrypted_blob'), // encrypted data as base64
  submitterWallet: text('submitter_wallet'),
  status: text('status').notNull().default('new'), // new, reviewed, resolved
  batchId: uuid('batch_id').references(() => batches.id),
  submissionHash: text('submission_hash'),
  merkleProof: jsonb('merkle_proof'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('submissions_form_id_idx').on(table.formId),
  index('submissions_status_idx').on(table.status),
  index('submissions_created_at_idx').on(table.createdAt),
]);

export const batches = pgTable('batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').references(() => forms.id).notNull(),
  submissionCount: integer('submission_count').notNull(),
  merkleRoot: text('merkle_root').notNull(),
  walrusBlobId: text('walrus_blob_id'),
  suiTxDigest: text('sui_tx_digest'),
  suiRegistryId: text('sui_registry_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminNotes = pgTable('admin_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').references(() => submissions.id).notNull(),
  authorWallet: text('author_wallet').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').references(() => forms.id).notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#6366f1'),
});

export const submissionTags = pgTable('submission_tags', {
  submissionId: uuid('submission_id').references(() => submissions.id).notNull(),
  tagId: uuid('tag_id').references(() => tags.id).notNull(),
}, (table) => [
  index('submission_tags_submission_idx').on(table.submissionId),
]);

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').references(() => forms.id),
  eventType: text('event_type'), // 'view', 'field_focus', 'field_blur', 'submit', 'abandon'
  fieldId: text('field_id'),
  sessionId: text('session_id'),
  device: text('device'),
  country: text('country'),
  timestamp: timestamp('timestamp').defaultNow(),
}, (table) => [
  index('analytics_form_id_idx').on(table.formId),
  index('analytics_event_type_idx').on(table.eventType),
]);
