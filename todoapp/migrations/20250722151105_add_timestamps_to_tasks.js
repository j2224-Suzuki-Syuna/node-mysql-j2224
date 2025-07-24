/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('tasks', function(table) {
    // created_atとupdated_atのカラムを追加する
    // defaultTo(knex.fn.now())で、作成時に現在時刻が自動で入るようにする
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('tasks', function(table) {
    table.dropTimestamps();
  });
};