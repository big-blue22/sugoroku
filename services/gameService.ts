import { GameEvent } from "../types";

// ローカルで保持するイベントリスト
const LOCAL_EVENTS: GameEvent[] = [
  // 進む系イベント
  { title: "追い風の加護", description: "心地よい風が背中を押し、足取りが軽くなった！", effectType: 'MOVE_FORWARD', value: 2 },
  { title: "隠し通路発見", description: "茂みの奥に近道を見つけた！ラッキー！", effectType: 'MOVE_FORWARD', value: 3 },
  { title: "天馬の助け", description: "通りすがりのペガサスが少しだけ乗せてくれた。", effectType: 'MOVE_FORWARD', value: 4 },
  { title: "魔法の地図", description: "地図が光り輝き、正しい道を示してくれる。", effectType: 'MOVE_FORWARD', value: 2 },
  { title: "加速のポーション", description: "落ちていた薬を飲んだら足が速くなった気がする！", effectType: 'MOVE_FORWARD', value: 3 },
  { title: "ワープゲート", description: "不思議な光に包まれて、前方へ転送された！", effectType: 'MOVE_FORWARD', value: 5 },

  // 戻る系イベント
  { title: "突然の豪雨", description: "激しい雨で足止めを食らい、少し戻ることに...", effectType: 'MOVE_BACK', value: 2 },
  { title: "落とし穴", description: "うわっ！地面に穴が開いていた！", effectType: 'MOVE_BACK', value: 3 },
  { title: "迷いの森", description: "気がつくと、さっき通った場所に戻っていた。", effectType: 'MOVE_BACK', value: 2 },
  { title: "強風", description: "ものすごい向かい風で押し戻される！", effectType: 'MOVE_BACK', value: 3 },
  { title: "忘れ物", description: "大事な荷物を忘れたことに気づいて取りに戻った。", effectType: 'MOVE_BACK', value: 1 },
  { title: "いたずら妖精", description: "妖精にいたずらされて、違う道へ誘導された。", effectType: 'MOVE_BACK', value: 2 },

  // 休み系イベント
  { title: "お昼寝タイム", description: "ポカポカ陽気で眠くなってしまった... Zzz...", effectType: 'SKIP_TURN', value: 0 },
  { title: "深い沼", description: "足が沼にはまって動けない！脱出に時間がかかりそうだ。", effectType: 'SKIP_TURN', value: 0 },
  { title: "魅力的な宴", description: "楽しそうな宴に参加して、旅を忘れてしまった。", effectType: 'SKIP_TURN', value: 0 },
  { title: "装備の故障", description: "靴紐が切れてしまった。修理に時間がかかる。", effectType: 'SKIP_TURN', value: 0 },

  // 何も起きない系イベント
  { title: "平和なひととき", description: "小鳥のさえずりが聞こえる。特に何も起きない。", effectType: 'NOTHING', value: 0 },
  { title: "宝箱発見？", description: "期待して開けたが、中は空っぽだった...", effectType: 'NOTHING', value: 0 },
  { title: "謎の石碑", description: "古代の文字が刻まれているが、読めない。", effectType: 'NOTHING', value: 0 },
  { title: "ただの猫", description: "道端に猫がいる。可愛い。", effectType: 'NOTHING', value: 0 },
];

export const generateGameEvent = async (playerName: string): Promise<GameEvent> => {
  // ネットワーク呼び出しを模倣して少しだけ待機（演出用）
  await new Promise(resolve => setTimeout(resolve, 800));

  // ランダムにイベントを選択
  const randomIndex = Math.floor(Math.random() * LOCAL_EVENTS.length);
  const event = LOCAL_EVENTS[randomIndex];

  // プレイヤー名を含めた説明文に微調整（必要であれば）
  // ここではシンプルにリストから返すだけにします
  return event;
};