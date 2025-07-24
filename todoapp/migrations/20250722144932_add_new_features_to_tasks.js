/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .table('tasks', function (table) {
      table.date('due_date'); // 期限日
      table.string('priority').defaultTo('medium'); // 優先度 (例: high, medium, low)
      table.string('status').defaultTo('pending'); // ステータス (例: pending, in_progress, completed)
    })
    .createTable('subtasks', function (table) {
      table.increments('id').primary();
      table.integer('task_id').unsigned().notNullable().references('id').inTable('tasks').onDelete('CASCADE');
      table.string('title').notNullable();
      table.boolean('is_completed').defaultTo(false);
      table.timestamps(true, true);
    })
    .createTable('categories', function (table) {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
    })
    .createTable('task_categories', function (table) {
      table.integer('task_id').unsigned().notNullable().references('id').inTable('tasks').onDelete('CASCADE');
      table.integer('category_id').unsigned().notNullable().references('id').inTable('categories').onDelete('CASCADE');
      table.primary(['task_id', 'category_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('task_categories')
    .dropTableIfExists('categories')
    .dropTableIfExists('subtasks')
    .table('tasks', function (table) {
      table.dropColumn('due_date');
      table.dropColumn('priority');
      table.dropColumn('status');
    });
};