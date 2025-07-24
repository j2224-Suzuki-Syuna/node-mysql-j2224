const express = require('express');
const router = express.Router();
const knex = require('../db/knex');

// GET: プロフィールページの表示
router.get('/', async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/signin');
    }

    try {
        const userId = req.user.id;

        // ★★★ データベースから最新のユーザー情報を取得 ★★★
        const currentUser = await knex('users').where({ id: userId }).first();

        const earnedBadges = await knex('user_badges')
            .join('badges', 'user_badges.badge_id', 'badges.id')
            .where('user_badges.user_id', userId)
            .select('badges.name', 'badges.description', 'badges.icon_char');

        res.render('profile', {
            title: 'プロフィール',
            // ★★★ 最新のユーザー情報を渡す ★★★
            user: currentUser,
            badges: earnedBadges,
            isAuth: true
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;