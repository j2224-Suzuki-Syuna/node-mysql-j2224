const express = require('express');
const router = express.Router();
const knex = require('../db/knex');

// GET: カテゴリ一覧と追加フォームの表示
router.get('/', function(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/signin');
  }

  knex('categories')
    .select('*')
    .then(function(categories) {
      res.render('calendar', {
        title: 'カテゴリ管理',
        categories: categories,
        isAuth: req.isAuthenticated(),
        // ★★★ userオブジェクトを渡す ★★★
        user: req.user
      });
    })
    .catch(function(err) {
      console.error(err);
      next(err);
    });
});

// POST: 新しいカテゴリの追加
router.post('/', function(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/signin');
  }

  const name = req.body.name;

  knex('categories')
    .insert({ name: name })
    .then(function() {
      res.redirect('/calendar');
    })
    .catch(function(err) {
      console.error(err);
      knex('categories')
        .select('*')
        .then(function(categories) {
          res.render('calendar', {
            title: 'カテゴリ管理',
            categories: categories,
            isAuth: req.isAuthenticated(),
            // ★★★ userオブジェクトを渡す ★★★
            user: req.user,
            errorMessage: ['カテゴリの追加に失敗しました。同じ名前のカテゴリが既に存在する可能性があります。'],
          });
        });
    });
});

module.exports = router;