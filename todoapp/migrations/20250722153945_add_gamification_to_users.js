/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    // level: ユーザーのレベル。デフォルトは1
    table.integer('level').notNullable().defaultTo(1);
    // points: ユーザーの経験値。デフォルトは0
    table.integer('points').notNullable().defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('level');
    table.dropColumn('points');
  });
};