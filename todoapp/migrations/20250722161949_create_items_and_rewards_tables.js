/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. 手に入る可能性のあるアイテムを定義するテーブル
  await knex.schema.createTable('items', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable(); // アイテム名
    table.string('description').notNullable(); // アイテムの説明
    table.string('icon_char').notNullable(); // 絵文字アイコン
    table.string('rarity').notNullable().defaultTo('common'); // レアリティ (common, rare, epic)
  })
  .raw('ALTER TABLE items CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'); // 絵文字対応

  // 2. ユーザーがどのアイテムを獲得したかを記録するテーブル
  await knex.schema.createTable('user_items', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('item_id').unsigned().notNullable().references('id').inTable('items').onDelete('CASCADE');
    table.timestamp('earned_at').defaultTo(knex.fn.now());
  });

  // 3. 初期アイテムを登録
  await knex('items').insert([
    { name: '小さな宝石', description: 'キラリと光る、ありふれた宝石。', icon_char: '💎', rarity: 'common' },
    { name: '古い金貨', description: 'かつて使われていた王国の金貨。', icon_char: '💰', rarity: 'common' },
    { name: '勇者の剣の破片', description: '伝説の剣の一部らしい。集めると何かが起きるかも…？', icon_char: '⚔️', rarity: 'rare' },
    { name: '神秘のポーション', description: '飲むと少しだけ元気が出る不思議な薬。', icon_char: '🧪', rarity: 'rare' },
    { name: '太陽のエンブレム', description: 'ごく稀に見つかる、眩い光を放つ紋章。', icon_char: '☀️', rarity: 'epic' }
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('user_items')
    .dropTableIfExists('items');
};