// Update with your config settings.

module.exports = {

  development: {
    client: "mysql",
    connection: {
      database: "todo_app",
      user: "root",
      password: "password",
      // ★★★ この行を追加 ★★★
      charset: 'utf8mb4'
    },
    pool: {
      min: 2,
      max: 10
    },
  },

  staging: {
    client: "mysql",
    connection: {
      database: "todo_app",
      user: "root",
      password: "password",
      charset: 'utf8mb4'
    },
    pool: {
      min: 2,
      max: 10
    },
  },

  production: {
    client: "mysql",
    connection: {
      database: "todo_app",
      user: "root",
      password: "password",
      charset: 'utf8mb4'
    },
    pool: {
      min: 2,
      max: 10
    },
  }

};