/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. バッジの種類を定義するテーブル
  await knex.schema.createTable('badges', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('description').notNullable();
    table.string('icon_char').notNullable();
    table.string('badge_code').notNullable().unique();
  })
  // ★★★ テーブルの文字コードを絵文字対応に変更 ★★★
  .raw('ALTER TABLE badges CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

  // 2. ユーザーがどのバッジを獲得したかを記録する中間テーブル
  await knex.schema.createTable('user_badges', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('badge_id').unsigned().notNullable().references('id').inTable('badges').onDelete('CASCADE');
    table.timestamp('earned_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'badge_id']);
  });

  // 3. 初期バッジを登録
  await knex('badges').insert([
    { name: 'はじめての一歩', description: '最初のタスクを完了した証です。', icon_char: '👣', badge_code: 'FIRST_STEP' },
    { name: 'タスク初心者', description: '合計10個のタスクを完了しました。', icon_char: '🔰', badge_code: 'TEN_TASKS' },
    { name: 'タスク名人', description: '合計50個のタスクを完了しました。', icon_char: '⭐', badge_code: 'FIFTY_TASKS' },
    { name: '優先度マスター', description: '「高」優先度のタスクを5個完了しました。', icon_char: '🔥', badge_code: 'PRIORITY_MASTER' }
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('user_badges')
    .dropTableIfExists('badges');
};