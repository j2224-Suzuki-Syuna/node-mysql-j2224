const knex = require('../db/knex');

// 宝箱から出る報酬のリストと確率
const REWARD_TABLE = [
    { type: 'points', value: 5, weight: 40 },   // 40%の確率で5ポイント
    { type: 'points', value: 10, weight: 20 },  // 20%の確率で10ポイント
    { type: 'points', value: 20, weight: 10 },  // 10%の確率で20ポイント
    { type: 'item', rarity: 'common', weight: 20 }, // 20%の確率でコモンアイテム
    { type: 'item', rarity: 'rare', weight: 8 },   // 8%の確率でレアアイテム
    { type: 'item', rarity: 'epic', weight: 2 },    // 2%の確率でエピックアイテム
];

// メインの報酬決定関数
const openTreasureChest = async (userId, req) => {
    try {
        // 1. 確率に基づいて報酬の種類を決定
        const totalWeight = REWARD_TABLE.reduce((sum, reward) => sum + reward.weight, 0);
        let random = Math.random() * totalWeight;
        let chosenReward;
        for (const reward of REWARD_TABLE) {
            random -= reward.weight;
            if (random < 0) {
                chosenReward = reward;
                break;
            }
        }
        
        let finalReward;

        // 2. 報酬の種類に応じて処理を分岐
        if (chosenReward.type === 'points') {
            await knex('users').where({ id: userId }).increment('points', chosenReward.value);
            finalReward = { type: 'points', value: chosenReward.value };
            console.log(`User ${userId} got bonus points: ${chosenReward.value}`);

        } else if (chosenReward.type === 'item') {
            // 対象レアリティのアイテムの中から、まだユーザーが持っていないものを探す
            const potentialItems = await knex('items')
                .where('rarity', chosenReward.rarity)
                .whereNotIn('id', function() {
                    this.select('item_id').from('user_items').where('user_id', userId);
                });
            
            let awardedItem;
            if (potentialItems.length > 0) {
                // まだ持っていないアイテムがあれば、その中からランダムで1つ選ぶ
                awardedItem = potentialItems[Math.floor(Math.random() * potentialItems.length)];
                await knex('user_items').insert({ user_id: userId, item_id: awardedItem.id });
            } else {
                // もし対象レアリティのアイテムをコンプリートしていたら、代わりにポイントを付与
                await knex('users').where({ id: userId }).increment('points', 25);
                finalReward = { type: 'points', value: 25, message: 'コンプリート済みの為、ボーナスポイントを獲得！' };
                console.log(`User ${userId} already has all ${chosenReward.rarity} items. Awarding bonus points.`);
            }

            if (awardedItem) {
                finalReward = { type: 'item', ...awardedItem };
                console.log(`User ${userId} got item: ${awardedItem.name}`);
            }
        }
        
        // 3. セッションに獲得した報酬を保存し、画面に通知できるようにする
        req.session.lastReward = finalReward;

    } catch (error) {
        console.error('Error opening treasure chest:', error);
    }
};

module.exports = { openTreasureChest };