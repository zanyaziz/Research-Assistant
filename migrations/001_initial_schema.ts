import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('topics', (t) => {
    t.string('id').primary();
    t.string('name').notNullable();
    t.text('description');
    t.boolean('enabled').defaultTo(true);
    t.string('schedule').notNullable();
    t.json('sources').notNullable();
    t.json('source_config').notNullable();
    t.json('quality_criteria').notNullable();
    t.json('tags').defaultTo('[]');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('research_runs', (t) => {
    t.string('id').primary();
    t.string('topic_id').references('id').inTable('topics').onDelete('CASCADE');
    t.string('status').notNullable(); // pending | running | completed | failed
    t.datetime('started_at');
    t.datetime('completed_at');
    t.json('stats');
    t.text('error');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('scraped_items', (t) => {
    t.string('id').primary();
    t.string('run_id').references('id').inTable('research_runs').onDelete('CASCADE');
    t.string('source_type').notNullable();
    t.text('url').notNullable();
    t.text('title');
    t.text('raw_content');
    t.text('snippet');
    t.string('author');
    t.datetime('published_at');
    t.json('metadata');
    t.float('relevance_score');
    t.datetime('scraped_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('briefs', (t) => {
    t.string('id').primary();
    t.string('run_id').references('id').inTable('research_runs').onDelete('CASCADE');
    t.string('topic_id').references('id').inTable('topics').onDelete('CASCADE');
    t.text('headline');
    t.json('content').notNullable();
    t.string('confidence'); // HIGH | MEDIUM | LOW
    t.date('brief_date').notNullable();
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('daily_digests', (t) => {
    t.string('id').primary();
    t.date('digest_date').unique().notNullable();
    t.text('summary');
    t.json('topic_briefs').notNullable();
    t.datetime('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('daily_digests');
  await knex.schema.dropTableIfExists('briefs');
  await knex.schema.dropTableIfExists('scraped_items');
  await knex.schema.dropTableIfExists('research_runs');
  await knex.schema.dropTableIfExists('topics');
}
