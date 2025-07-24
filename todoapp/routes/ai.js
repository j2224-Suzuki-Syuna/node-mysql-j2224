const express = require('express');
const router = express.Router();
const knex = require('../db/knex');

// AIによるタスク生成処理
router.post('/generate', async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/signin');
    }

    const userId = req.user.id;
    const goal = req.body.goal;

    // AIの代わりとなるテンプレートを定義
    const templates = {
        "キャンプ": ["テントを予約する", "食材を買い出しする", "当日の天気予報を確認する", "荷物を車に積む"],
        "勉強": ["学習計画を立てる", "参考書を読む (1章)", "練習問題を解く", "分からなかった点を復習する"],
        "旅行": ["航空券とホテルを予約する", "観光スポットをリストアップする", "パッキングリストを作成する", "外貨を準備する"],
    };

    let generatedTasks = [];
    // 入力された目標にキーワードが含まれているかチェック
    for (const keyword in templates) {
        if (goal.includes(keyword)) {
            generatedTasks = templates[keyword];
            break;
        }
    }

    // 適切なテンプレートがなければ、汎用的なタスクを生成
    if (generatedTasks.length === 0) {
        generatedTasks = [`${goal}の計画を立てる`, `${goal}に必要なものをリストアップする`, `${goal}を実行する`];
    }

    try {
        // 親タスクを作成
        const parentTaskIds = await knex('tasks').insert({
            user_id: userId,
            content: goal,
            priority: 'high' // AIが生成したタスクは優先度「高」に
        }).returning('id');
        
        const parentTaskId = parentTaskIds[0].id || parentTaskIds[0];

        // サブタスクとして一括登録
        const subtasksToInsert = generatedTasks.map(taskContent => ({
            task_id: parentTaskId,
            title: taskContent,
        }));

        await knex('subtasks').insert(subtasksToInsert);

        res.redirect('/');
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;