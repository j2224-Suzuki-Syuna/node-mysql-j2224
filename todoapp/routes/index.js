const { checkAndAwardBadges } = require('../services/badgeService');
const { openTreasureChest } = require('../services/rewardService'); 
const express = require('express');
const router = express.Router();
const knex = require('../db/knex');

// ミドルウェア：ユーザーのタスク、サブタスク、カテゴリ、そして最新のユーザー情報を全て取得
function getDataForRender(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  const userId = req.user.id;
  const { keyword, status, priority } = req.query;

  const taskQuery = knex('tasks')
    .leftJoin('task_categories', 'tasks.id', 'task_categories.task_id')
    .leftJoin('categories', 'task_categories.category_id', 'categories.id')
    .select('tasks.id', 'tasks.content', 'tasks.due_date', 'tasks.priority', 'tasks.status', 'categories.name as category_name', 'categories.id as category_id')
    .where('tasks.user_id', userId);

  if (keyword) { taskQuery.where('tasks.content', 'like', `%${keyword}%`); }
  if (status && status !== 'all') { taskQuery.where('tasks.status', status); }
  if (priority && priority !== 'all') { taskQuery.where('tasks.priority', priority); }
  taskQuery.orderBy('tasks.created_at', 'desc');

  Promise.all([
    taskQuery,
    knex('categories').select('*'),
    knex('subtasks').whereIn('task_id', function() { this.select('id').from('tasks').where('user_id', userId); }),
    // ★★★ 修正点：データベースから最新のユーザー情報を取得する ★★★
    knex('users').where({ id: userId }).first()
  ])
  .then(function([tasks, categories, subtasks, refreshedUser]) {
    // ★★★ 修正点：取得した最新のユーザー情報で、リクエストのユーザー情報を上書きする ★★★
    req.user = refreshedUser;

    const subtasksByTaskId = subtasks.reduce((acc, subtask) => {
      if (!acc[subtask.task_id]) { acc[subtask.task_id] = []; }
      acc[subtask.task_id].push(subtask);
      return acc;
    }, {});

    tasks.forEach(task => {
      task.subtasks = subtasksByTaskId[task.id] || [];
      if (task.due_date) {
        const d = new Date(task.due_date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        task.due_date_formatted = d.toISOString().split('T')[0];
      }
    });

    req.todos = tasks;
    req.categories = categories;
    next();
  })
  .catch(function(err) {
    console.error("Error fetching data:", err);
    req.todos = [];
    req.categories = [];
    req.fetchError = 'データの読み込み中にエラーが発生しました。';
    next();
  });
}

// GET: タスク一覧ページ
router.get('/', getDataForRender, function (req, res, next) {
  const isAuth = req.isAuthenticated();
  const errors = req.fetchError ? [req.fetchError] : [];
  // セッションに保存された報酬・バッジ情報を取得
  const lastReward = req.session.lastReward;
  const newlyEarnedBadge = req.session.newlyEarnedBadge;

  // 一度表示したら、セッションから情報を削除する
  delete req.session.lastReward;
  delete req.session.newlyEarnedBadge;

  res.render('index', {
    title: 'ToDo App',
    todos: req.todos || [],
    categories: req.categories || [],
    isAuth: isAuth,
    user: req.user,
    errorMessage: errors,
    queryParams: req.query,
    // 取得した情報をビューに渡す
    lastReward: lastReward,
    newlyEarnedBadge: newlyEarnedBadge,
  });
});

// ... (他のルートは、昨日お渡しした完全版から変更ありません。念のため以下に全コードを記載します) ...

router.post('/', function (req, res, next) {
    const isAuth = req.isAuthenticated();
    if (!isAuth) { return res.redirect('/'); }
    const userId = req.user.id;
    const { add: content, due_date, priority, category_id } = req.body;
    let newTaskId;
    knex('tasks').insert({ user_id: userId, content: content, due_date: due_date || null, priority: priority, }).returning('id')
    .then(ids => {
        newTaskId = ids[0].id || ids[0];
        if (category_id && category_id !== 'none') {
            return knex('task_categories').insert({ task_id: newTaskId, category_id: category_id, });
        }
    })
    .then(() => res.redirect('/'))
    .catch(err => {
        console.error("Error adding task:", err);
        getDataForRender(req, res, () => {
            res.render('index', {
                title: 'ToDo App', todos: req.todos || [], categories: req.categories || [],
                isAuth, user: req.user, errorMessage: ['タスクの追加中にエラーが発生しました。'], queryParams: {},
            });
        });
    });
});
router.get('/:id/edit', function(req, res, next) {
    if (!req.isAuthenticated()) { return res.redirect('/signin'); }
    const userId = req.user.id;
    const taskId = req.params.id;
    Promise.all([
        knex('tasks').leftJoin('task_categories', 'tasks.id', 'task_categories.task_id').select('tasks.*', 'task_categories.category_id').where('tasks.id', taskId).andWhere('tasks.user_id', userId).first(),
        knex('categories').select('*')
    ]).then(([task, categories]) => {
        if (!task) { return res.status(404).send('タスクが見つかりません'); }
        if (task.due_date) {
            const d = new Date(task.due_date);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            task.due_date_formatted = d.toISOString().split('T')[0];
        }
        res.render('edit', { title: 'タスクの編集', todo: task, categories: categories, isAuth: true, user: req.user });
    }).catch(err => { console.error(err); next(err); });
});
router.post('/:id/edit', function(req, res, next) {
    if (!req.isAuthenticated()) { return res.redirect('/signin'); }
    const userId = req.user.id;
    const taskId = req.params.id;
    const { content, due_date, priority, category_id } = req.body;
    knex('tasks').where({ id: taskId, user_id: userId }).update({ content: content, due_date: due_date || null, priority: priority, })
    .then(() => knex('task_categories').where({ task_id: taskId }).del())
    .then(() => { if (category_id && category_id !== 'none') { return knex('task_categories').insert({ task_id: taskId, category_id: category_id }); } })
    .then(() => res.redirect('/'))
    .catch(err => { console.error(err); next(err); });
});
router.post('/:id/status', function (req, res, next) {
  const isAuth = req.isAuthenticated();
  if (!isAuth) { return res.redirect('/'); }
  const taskId = req.params.id;
  const userId = req.user.id;
  const currentStatus = req.body.status;
  const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
  knex("tasks").where({ id: taskId, user_id: userId }).update({ status: newStatus })
    .then(() => {
      if (newStatus === 'completed') {
        const POINTS_PER_TASK = 10;
        return knex('users').where({ id: userId }).increment('points', POINTS_PER_TASK);
      }
    }).then(() => {
        return knex('users').where({id: userId}).first();
    }).then(user => {
        if (!user || currentStatus === 'completed') { return; }
        const requiredPointsForNextLevel = user.level * 50;
        if (user.points >= requiredPointsForNextLevel) {
            return knex('users').where({ id: userId }).update({ level: user.level + 1, points: user.points - requiredPointsForNextLevel });
        }
    }).then(() => {
      res.redirect('/');
    }).catch(err => {
      console.error(`Error updating task status for task ${taskId}:`, err);
      res.redirect('/');
    });
});
router.post('/:id/delete', function (req, res, next) {
  const isAuth = req.isAuthenticated();
  if (!isAuth) { return res.redirect('/'); }
  const taskId = req.params.id;
  const userId = req.user.id;
  knex("tasks").where({ id: taskId, user_id: userId }).del()
    .then(() => res.redirect('/'))
    .catch(err => { console.error(`Error deleting task ${taskId}:`, err); res.redirect('/'); });
});
router.post('/:taskId/subtasks', function(req, res, next) {
    if (!req.isAuthenticated()) { return res.redirect('/signin'); }
    const taskId = req.params.taskId;
    const content = req.body.subtask_content;
    knex('subtasks').insert({ task_id: taskId, title: content })
        .then(() => res.redirect('/'))
        .catch(err => { console.error(err); next(err); });
});
router.post('/subtasks/:subtaskId/status', function(req, res, next) {
    if (!req.isAuthenticated()) { return res.redirect('/signin'); }
    const subtaskId = req.params.subtaskId;
    const isCompleted = req.body.is_completed === 'true';
    knex('subtasks').where({ id: subtaskId }).update({ is_completed: !isCompleted })
        .then(() => res.redirect('/'))
        .catch(err => { console.error(err); next(err); });
});
router.post('/subtasks/:subtaskId/delete', function(req, res, next) {
    if (!req.isAuthenticated()) { return res.redirect('/signin'); }
    const subtaskId = req.params.subtaskId;
    knex('subtasks').where({ id: subtaskId }).del()
        .then(() => res.redirect('/'))
        .catch(err => { console.error(err); next(err); });
});
// POST: タスクのステータス更新 (★ ミニゲーム処理を追加 ★)
router.post('/:id/status', async function (req, res, next) {
  try {
    // ...
    if (newStatus === 'completed') {
      // ★★★ お宝ゲットチャレンジを実行 ★★★
      await openTreasureChest(userId, req);
      
      // ... (既存のレベルアップ、バッジチェック処理) ...
    }
    res.redirect('/');
  } catch (err) {
    // ...
  }
});
router.use('/signup', require('./signup'));
router.use('/signin', require('./signin'));
router.use('/logout', require('./logout'));

module.exports = router;