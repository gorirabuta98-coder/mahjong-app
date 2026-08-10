'use client';

import { useState } from 'react';

type Player = {
  name: string;
  score: number;
};

type HandType = 'normal' | 'pinfu' | 'chiitoi';

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([
    { name: 'プレイヤーA', score: 35000 },
    { name: 'プレイヤーB', score: 35000 },
    { name: 'プレイヤーC', score: 35000 },
  ]);

  const [winner, setWinner] = useState<number>(0);
  const [isParent, setIsParent] = useState<boolean>(false);
  const [winType, setWinType] = useState<'ron' | 'tsumo'>('ron');
  const [handType, setHandType] = useState<HandType>('normal');
  const [isNaki, setIsNaki] = useState<boolean>(false);
  const [loser, setLoser] = useState<number>(1);
  const [han, setHan] = useState<number>(1);
  const [riichiFlags, setRiichiFlags] = useState<boolean[]>([false, false, false]);
  const [log, setLog] = useState<string>('直近の履歴がここに表示されます');
  const [history, setHistory] = useState<Player[][]>([]);

  // 100点単位切り上げ
  const roundUp100 = (val: number) => Math.ceil(val / 100) * 100;

  // リーチ状態の切り替え
  const toggleRiichi = (index: number) => {
    const updated = [...riichiFlags];
    updated[index] = !updated[index];
    setRiichiFlags(updated);
  };

  // ホワイトボードの表に基づく子の基本点数判定
  const getChildScore = (): number | null => {
    if (han >= 13) return 32000;
    if (han >= 11) return 24000;
    if (han >= 8) return 16000;
    if (han >= 6) return 12000;
    if (han >= 4) return 8000;

    if (handType === 'chiitoi') {
      if (winType === 'ron') {
        if (han === 1) return null;
        if (han === 2) return 1600;
        if (han === 3) return 3200;
      } else {
        if (han === 1 || han === 2) return null;
        if (han === 3) return 3200;
      }
    }

    if (handType === 'pinfu') {
      if (winType === 'ron') {
        if (han === 1) return 1000;
        if (han === 2) return 2000;
        if (han === 3) return 3900;
      } else {
        if (han === 1) return null;
        if (han === 2) return 1500;
        if (han === 3) return 2700;
      }
    }

    if (winType === 'ron') {
      if (isNaki) {
        if (han === 1) return 1000;
        if (han === 2) return 2000;
        if (han === 3) return 3900;
      } else {
        if (han === 1) return 1300;
        if (han === 2) return 2600;
        if (han === 3) return 5200;
      }
    } else {
      if (han === 1) return 1100;
      if (han === 2) return 2000;
      if (han === 3) return 4000;
    }

    return null;
  };

  const childScore = getChildScore();
  const calculatedTotalScore = childScore !== null
    ? (isParent ? roundUp100(childScore * 1.5) : childScore)
    : null;

  // 場に出ているリーチ棒の合計点
  const totalRiichiStick = riichiFlags.filter(Boolean).length * 1000;

  // プレイヤー名変更
  const handleNameChange = (index: number, newName: string) => {
    const updated = [...players];
    updated[index].name = newName;
    setPlayers(updated);
  };

  // 点数計算＆反映
  const applyWin = () => {
    if (calculatedTotalScore === null) return;

    setHistory([...history, players.map((p) => ({ ...p }))]);
    const newPlayers = players.map((p) => ({ ...p }));
    let logMsg = '';

    // 1. リーチを出した人から1,000点ずつ引き落とす
    riichiFlags.forEach((hasRiichi, idx) => {
      if (hasRiichi) {
        newPlayers[idx].score -= 1000;
      }
    });

    // 2. 通常のアガリ点数の移動
    if (winType === 'tsumo') {
      const payEach = roundUp100(calculatedTotalScore / 2);
      const actualTotal = payEach * 2;
      newPlayers[winner].score += actualTotal;
      newPlayers.forEach((p, idx) => {
        if (idx !== winner) p.score -= payEach;
      });
      logMsg = `${newPlayers[winner].name}(${isParent ? '親' : '子'}) ツモ：+${actualTotal} (他2人 各-${payEach})`;
    } else {
      newPlayers[winner].score += calculatedTotalScore;
      newPlayers[loser].score -= calculatedTotalScore;
      logMsg = `${newPlayers[winner].name} ロン (${newPlayers[loser].name}から)：+${calculatedTotalScore} / -${calculatedTotalScore}`;
    }

    // 3. 総リーチ棒を勝者に加算
    if (totalRiichiStick > 0) {
      newPlayers[winner].score += totalRiichiStick;
      logMsg += ` [供託リーチ棒 +${totalRiichiStick}点]`;
    }

    setPlayers(newPlayers);
    setLog(logMsg);
    setRiichiFlags([false, false, false]);
  };

  // 35,000点にリセット
  const resetScores = () => {
    if (!window.confirm('全員の持ち点を35,000点にリセットしますか？')) return;
    setHistory([...history, players.map((p) => ({ ...p }))]);
    const resetPlayers = players.map((p) => ({ ...p, score: 35000 }));
    setPlayers(resetPlayers);
    setRiichiFlags([false, false, false]);
    setLog('持ち点を35,000点にリセットしました');
  };

  // 元に戻す
  const undo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setPlayers(lastState);
    setHistory(history.slice(0, -1));
    setLog('1つ前の状態に戻しました');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 flex flex-col items-center">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold text-center text-yellow-400 py-2">
          3人麻雀 持ち点スコアラー
        </h1>

        {/* スコアボード */}
        <div className="grid grid-cols-3 gap-2">
          {players.map((p, idx) => (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-center shadow"
            >
              <input
                type="text"
                value={p.name}
                onChange={(e) => handleNameChange(idx, e.target.value)}
                className="w-full text-center bg-transparent text-xs font-bold text-slate-400 border-b border-slate-700 pb-1 mb-1 focus:outline-none focus:border-yellow-500"
              />
              <div className="text-lg font-bold text-blue-400">{p.score}</div>
            </div>
          ))}
        </div>

        {/* アガリ入力フォーム */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 shadow-lg">
          
          {/* リーチ選択ボタン */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              リーチ宣言者（タップでON/OFF）
            </label>
            <div className="grid grid-cols-3 gap-2">
              {players.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleRiichi(i)}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition ${
                    riichiFlags[i]
                      ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/50'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {p.name} {riichiFlags[i] ? '立直' : ''}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              アガった人（勝者）
            </label>
            <select
              value={winner}
              onChange={(e) => {
                const val = Number(e.target.value);
                setWinner(val);
                if (val === loser) setLoser((val + 1) % 3);
              }}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
            >
              {players.map((p, i) => (
                <option key={i} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                立場
              </label>
              <select
                value={isParent ? 'parent' : 'child'}
                onChange={(e) => setIsParent(e.target.value === 'parent')}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
              >
                <option value="child">子</option>
                <option value="parent">親</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                アガリ形
              </label>
              <select
                value={winType}
                onChange={(e) => setWinType(e.target.value as 'ron' | 'tsumo')}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
              >
                <option value="ron">ロン</option>
                <option value="tsumo">ツモ</option>
              </select>
            </div>
          </div>

          {/* 手役タイプ & 鳴き選択 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                手役タイプ
              </label>
              <select
                value={handType}
                onChange={(e) => {
                  const val = e.target.value as HandType;
                  setHandType(val);
                  if (val === 'chiitoi' || val === 'pinfu') setIsNaki(false);
                }}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
              >
                <option value="normal">通常手</option>
                <option value="pinfu">平和（ピンフ）</option>
                <option value="chiitoi">七対子（チートイ）</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                鳴き（副露）
              </label>
              <select
                value={isNaki ? 'ari' : 'nashi'}
                disabled={handType !== 'normal'}
                onChange={(e) => setIsNaki(e.target.value === 'ari')}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none disabled:opacity-40"
              >
                <option value="nashi">なし（門前）</option>
                <option value="ari">あり</option>
              </select>
            </div>
          </div>

          {winType === 'ron' && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                放銃した人（振り込んだ人）
              </label>
              <select
                value={loser}
                onChange={(e) => setLoser(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
              >
                {players.map((p, i) =>
                  i !== winner ? (
                    <option key={i} value={i}>
                      {p.name}
                    </option>
                  ) : null
                )}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              翻数
            </label>
            <select
              value={han}
              onChange={(e) => setHan(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
            >
              <option value={1}>1翻</option>
              <option value={2}>2翻</option>
              <option value={3}>3翻</option>
              <option value={4}>4〜5翻（満貫 8000点）</option>
              <option value={6}>6〜7翻（跳満 12000点）</option>
              <option value={8}>8〜10翻（倍満 16000点）</option>
              <option value={11}>11〜12翻（三倍満 24000点）</option>
              <option value={13}>13翻以上（役満 32000点）</option>
            </select>
          </div>

          {/* 計算結果プレビュー */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-1">獲得予定点数</span>
            {calculatedTotalScore !== null ? (
              <div>
                <span className="text-xl font-bold text-yellow-400">
                  {calculatedTotalScore + totalRiichiStick} 点
                </span>
                {totalRiichiStick > 0 && (
                  <span className="text-xs text-red-400 block mt-0.5">
                    （アガリ点 {calculatedTotalScore} + リーチ棒 {totalRiichiStick}）
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm font-bold text-red-400">
                ✕ なし（アガれない組み合わせです）
              </span>
            )}
          </div>

          <button
            onClick={applyWin}
            disabled={calculatedTotalScore === null}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-base transition duration-150 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            点数を計算して反映
          </button>

          {/* サブ操作ボタン（Undo & リセット） */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
            >
              1つ前に戻す (Undo)
            </button>

            <button
              onClick={resetScores}
              className="w-full py-2 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold rounded-lg text-xs transition duration-150"
            >
              点数リセット (35,000点)
            </button>
          </div>
        </div>

        {/* 履歴表示 */}
        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-xs text-slate-400 text-center">
          {log}
        </div>
      </div>
    </main>
  );
}