const knex = require('../db/knex');

// チェックするバッジの定義
const BADGE_CHECKS = {
  // 完了したタスクの総数に基づくバッジ
  COUNT_BASED: [
    { code: 'FIRST_STEP', requiredCount: 1 },
    { code: 'TEN_TASKS', requiredCount: 10 },
    { code: 'FIFTY_TASKS', requiredCount: 50 },
  ],
  // 完了したタスクのプロパティに基づくバッジ
  PROPERTY_BASED: [
    { code: 'PRIORITY_MASTER', requiredCount: 5, property: 'priority', value: 'high' }
  ]
};

// ユーザーが既に持っているバッジを取得するヘルパー関数
async function getUserBadgeCodes(userId) {
  const userBadges = await knex('user_badges')
    .join('badges', 'user_badges.badge_id', 'badges.id')
    .where('user_badges.user_id', userId)
    .select('badges.badge_code');
  return userBadges.map(b => b.badge_code);
}

// 新しいバッジを授与するヘルパー関数
async function awardBadge(userId, badgeCode, req) {
  try {
    const badge = await knex('badges').where({ badge_code: badgeCode }).first();
    if (badge) {
      // 念のため、同じバッジを複数回授与しないようにチェック
      const existingBadge = await knex('user_badges').where({ user_id: userId, badge_id: badge.id }).first();
      if (!existingBadge) {
        await knex('user_badges').insert({ user_id: userId, badge_id: badge.id });
        // セッションに獲得したバッジ情報を保存して、画面に通知できるようにする
        req.session.newlyEarnedBadge = badge;
        console.log(`User ${userId} earned badge: ${badge.name}`);
      }
    }
  } catch (error) {
      // ユニーク制約違反（ほぼ同時に2回獲得しようとした場合など）を無視
      if (error.code !== 'ER_DUP_ENTRY') {
          console.error('Error awarding badge:', error);
      }
  }
}

// メインのバッジチェック関数
const checkAndAwardBadges = async (userId, req) => {
  try {
    const userOwnedBadges = await getUserBadgeCodes(userId);

    // 1. 総数ベースのバッジをチェック
    const completedTasksCount = await knex('tasks').where({ user_id: userId, status: 'completed' }).count('id as count').first();
    const totalCount = completedTasksCount.count;

    for (const badge of BADGE_CHECKS.COUNT_BASED) {
      if (totalCount >= badge.requiredCount && !userOwnedBadges.includes(badge.code)) {
        await awardBadge(userId, badge.code, req);
      }
    }

    // 2. プロパティベースのバッジをチェック
    for (const badge of BADGE_CHECKS.PROPERTY_BASED) {
        if (!userOwnedBadges.includes(badge.code)) {
            const propCountResult = await knex('tasks')
                .where({ user_id: userId, status: 'completed', [badge.property]: badge.value })
                .count('id as count')
                .first();
            if (propCountResult.count >= badge.requiredCount) {
                await awardBadge(userId, badge.code, req);
            }
        }
    }

  } catch (error) {
    console.error('Error checking for badges:', error);
  }
};

module.exports = { checkAndAwardBadges };