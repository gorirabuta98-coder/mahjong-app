'use client';

import { useMemo, useState } from 'react';

type Player = { name: string; score: number };
type HandType = 'normal' | 'chiitoi' | 'yakuman';
type WinType = 'ron' | 'tsumo';
type TsumoRule = 'standard' | 'none' | 'plus1000';
type Payment = { player: string; amount: number };

const FU_VALUES = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
const HAN_VALUES = Array.from({ length: 13 }, (_, index) => index + 1);
const roundUp100 = (value: number) => Math.ceil(value / 100) * 100;
const formatScore = (value: number) => `${value.toLocaleString('ja-JP')}点`;

function getCappedBase(fu: number, han: number, kiriage: boolean) {
  const base = fu * 2 ** (han + 2);
  if (han >= 13) return 8000;
  if (han >= 11) return 6000;
  if (han >= 8) return 4000;
  if (han >= 6) return 3000;
  if (han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70) || (kiriage && han === 4 && fu >= 30)) return 2000;
  return base;
}

function calculateRonScore(fu: number, han: number, isParent: boolean, handType: HandType, kiriage: boolean) {
  if (handType === 'yakuman') return isParent ? 48000 : 32000;
  return roundUp100(getCappedBase(fu, han, kiriage) * (isParent ? 6 : 4));
}

function calculatePayments(fu: number, han: number, isParent: boolean, winType: WinType, handType: HandType, kiriage: boolean, tsumoRule: TsumoRule, opponents: Player[]) {
  const ronScore = calculateRonScore(fu, han, isParent, handType, kiriage);
  if (winType === 'ron') return { total: ronScore, payments: [{ player: opponents[0].name, amount: ronScore }] };

  let standardPayments: Payment[];
  if (handType === 'yakuman') {
    const parentPayment = isParent ? 24000 : 16000;
    const childPayment = isParent ? 24000 : 8000;
    standardPayments = isParent
      ? opponents.map((player) => ({ player: player.name, amount: parentPayment }))
      : opponents.map((player, index) => ({ player: player.name, amount: index === 0 ? parentPayment : childPayment }));
  } else {
    const base = getCappedBase(fu, han, kiriage);
    standardPayments = isParent
      ? opponents.map((player) => ({ player: player.name, amount: roundUp100(base * 2) }))
      : opponents.map((player, index) => ({ player: player.name, amount: roundUp100(base * (index === 0 ? 2 : 1)) }));
  }

  const payments = standardPayments.map((payment) => ({
    ...payment,
    amount: tsumoRule === 'standard' ? payment.amount : tsumoRule === 'plus1000' ? Math.max(100, payment.amount - 1000) : roundUp100(payment.amount / 2),
  }));
  return { total: payments.reduce((sum, payment) => sum + payment.amount, 0), payments };
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([
    { name: 'プレイヤーA', score: 35000 },
    { name: 'プレイヤーB', score: 35000 },
    { name: 'プレイヤーC', score: 35000 },
  ]);
  const [winner, setWinner] = useState(0);
  const [loser, setLoser] = useState(1);
  const [isParent, setIsParent] = useState(false);
  const [winType, setWinType] = useState<WinType>('ron');
  const [handType, setHandType] = useState<HandType>('normal');
  const [isNaki, setIsNaki] = useState(false);
  const [fu, setFu] = useState(30);
  const [han, setHan] = useState(1);
  const [riichiFlags, setRiichiFlags] = useState([false, false, false]);
  const [tsumoRule, setTsumoRule] = useState<TsumoRule>('standard');
  const [kiriage, setKiriage] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [history, setHistory] = useState<Player[][]>([]);
  const [log, setLog] = useState('ここに直近の点数移動が表示されます');

  const opponents = players.filter((_, index) => index !== winner);
  const paymentOpponents = winType === 'ron' ? players.filter((_, index) => index === loser) : opponents;
  const riichiStick = riichiFlags.filter(Boolean).length * 1000;
  const result = useMemo(() => calculatePayments(handType === 'chiitoi' ? 25 : fu, handType === 'chiitoi' ? 2 : han, isParent, winType, handType, kiriage, tsumoRule, paymentOpponents), [fu, han, isParent, winType, handType, kiriage, tsumoRule, paymentOpponents]);

  const updateName = (index: number, name: string) => setPlayers((current) => current.map((player, playerIndex) => playerIndex === index ? { ...player, name } : player));
  const toggleRiichi = (index: number) => setRiichiFlags((current) => current.map((value, flagIndex) => flagIndex === index ? !value : value));

  const applyWin = () => {
    const nextPlayers = players.map((player) => ({ ...player }));
    setHistory((current) => [...current, players.map((player) => ({ ...player }))]);
    riichiFlags.forEach((declared, index) => { if (declared) nextPlayers[index].score -= 1000; });

    if (winType === 'ron') {
      nextPlayers[winner].score += result.total;
      nextPlayers[loser].score -= result.total;
    } else {
      result.payments.forEach((payment) => {
        const opponentIndex = players.findIndex((player) => player.name === payment.player);
        nextPlayers[opponentIndex].score -= payment.amount;
        nextPlayers[winner].score += payment.amount;
      });
    }

    nextPlayers[winner].score += riichiStick;
    setPlayers(nextPlayers);
    setRiichiFlags([false, false, false]);
    setLog(`${players[winner].name}が${winType === 'ron' ? `${players[loser].name}から${formatScore(result.total)}` : `ツモ ${formatScore(result.total)}`}。供託 ${formatScore(riichiStick)}を獲得`);
  };

  const resetScores = () => {
    setHistory((current) => [...current, players.map((player) => ({ ...player }))]);
    setPlayers((current) => current.map((player) => ({ ...player, score: 35000 })));
    setRiichiFlags([false, false, false]);
    setLog('全員の持ち点を35,000点に戻しました');
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setPlayers(previous);
    setHistory((current) => current.slice(0, -1));
    setLog('直前の点数移動を取り消しました');
  };

  return (
    <main className="min-h-screen bg-[#071225] px-4 py-5 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="flex items-end justify-between border-b border-slate-800 pb-4"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400">SANMA SCORE TABLE</p><h1 className="text-2xl font-black tracking-tight text-amber-300">三麻 点数管理</h1></div><span className="rounded-full border border-amber-400/30 bg-amber-300/10 px-3 py-1 text-[11px] font-bold text-amber-200">3 PLAYER</span></header>
+
        <section className="grid grid-cols-3 gap-2" aria-label="プレイヤーの持ち点">{players.map((player, index) => <div key={index} className={`rounded-xl border p-3 shadow-lg shadow-black/10 ${winner === index ? 'border-cyan-400/60 bg-[#102842]' : 'border-slate-700/80 bg-[#0d1c32]'}`}><input value={player.name} onChange={(event) => updateName(index, event.target.value)} aria-label={`${player.name}の名前`} className="mb-2 w-full min-w-0 border-b border-slate-700 bg-transparent pb-1 text-center text-[11px] font-bold text-slate-300 outline-none focus:border-cyan-400" /><p className="text-center text-lg font-black tabular-nums text-cyan-300">{player.score.toLocaleString('ja-JP')}</p><p className="mt-1 text-center text-[9px] font-bold tracking-widest text-slate-500">{winner === index ? 'WINNER' : `PLAYER ${String.fromCharCode(65 + index)}`}</p></div>)}</section>
+
        <section className="rounded-2xl border border-slate-700/80 bg-[#0b1a2e] p-4 shadow-2xl shadow-black/20 sm:p-5">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold tracking-[0.2em] text-cyan-400">ROUND INPUT</p><h2 className="mt-1 text-lg font-bold text-slate-100">アガリを記録</h2></div><div className="rounded-lg bg-slate-900 px-3 py-2 text-right"><p className="text-[10px] text-slate-500">供託</p><p className="font-bold text-amber-300">{riichiStick.toLocaleString('ja-JP')}点</p></div></div>
+
          <div className="space-y-4">
            <div><label className="mb-2 block text-xs font-bold text-slate-400">リーチ宣言者</label><div className="grid grid-cols-3 gap-2">{players.map((player, index) => <button key={index} type="button" onClick={() => toggleRiichi(index)} className={`min-h-11 rounded-lg border px-1 text-xs font-bold transition ${riichiFlags[index] ? 'border-red-400 bg-red-500/20 text-red-200' : 'border-slate-700 bg-slate-900/80 text-slate-400 hover:border-slate-500'}`}>{player.name}{riichiFlags[index] && <span className="ml-1 text-[10px]">1,000</span>}</button>)}</div></div>
+
            <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-400">勝者<select value={winner} onChange={(event) => { const nextWinner = Number(event.target.value); setWinner(nextWinner); if (nextWinner === loser) setLoser(nextWinner === 0 ? 1 : 0); }} className="field mt-2"><option value={0}>{players[0].name}</option><option value={1}>{players[1].name}</option><option value={2}>{players[2].name}</option></select></label><label className="text-xs font-bold text-slate-400">立場<select value={isParent ? 'parent' : 'child'} onChange={(event) => setIsParent(event.target.value === 'parent')} className="field mt-2"><option value="child">子</option><option value="parent">親</option></select></label></div>
            <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-400">アガリ形<select value={winType} onChange={(event) => setWinType(event.target.value as WinType)} className="field mt-2"><option value="ron">ロン</option><option value="tsumo">ツモ</option></select></label><label className="text-xs font-bold text-slate-400">手役タイプ<select value={handType} onChange={(event) => setHandType(event.target.value as HandType)} className="field mt-2"><option value="normal">通常手</option><option value="chiitoi">七対子</option><option value="yakuman">役満</option></select></label></div>
            {winType === 'ron' && <label className="block text-xs font-bold text-slate-400">放銃した人<select value={loser} onChange={(event) => setLoser(Number(event.target.value))} className="field mt-2">{players.map((player, index) => index !== winner && <option key={index} value={index}>{player.name}</option>)}</select></label>}
            <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-400">符数{handType === 'chiitoi' ? <span className="mt-2 block rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-sm text-amber-200">25符 固定</span> : <select value={fu} onChange={(event) => setFu(Number(event.target.value))} disabled={handType === 'yakuman'} className="field mt-2 disabled:opacity-50">{FU_VALUES.map((value) => <option key={value} value={value}>{value}符</option>)}</select>}</label><label className="text-xs font-bold text-slate-400">翻数<select value={han} onChange={(event) => setHan(Number(event.target.value))} disabled={handType === 'yakuman'} className="field mt-2 disabled:opacity-50">{HAN_VALUES.map((value) => <option key={value} value={value}>{value}翻{value === 13 ? '（役満）' : ''}</option>)}</select></label></div>
            <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-3 text-xs font-bold text-slate-300">鳴き（副露）<select value={isNaki ? 'あり' : 'なし'} onChange={(event) => setIsNaki(event.target.value === 'あり')} disabled={handType !== 'normal'} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200 outline-none disabled:opacity-40"><option>なし</option><option>あり</option></select></label>
            <button type="button" onClick={() => setShowRules((current) => !current)} className="flex w-full items-center justify-between border-y border-slate-800 py-3 text-left text-xs font-bold text-slate-300"><span>詳細ルール設定</span><span className="text-cyan-400">{showRules ? '閉じる −' : '開く ＋'}</span></button>
            {showRules && <div className="grid gap-3 rounded-lg bg-slate-900/70 p-3"><label className="text-xs font-bold text-slate-400">ツモ損ルール<select value={tsumoRule} onChange={(event) => setTsumoRule(event.target.value as TsumoRule)} className="field mt-2"><option value="standard">あり（標準 / 天鳳）</option><option value="none">なし（全額支払い）</option><option value="plus1000">なし（1,000点加符）</option></select></label><label className="flex items-center justify-between text-xs font-bold text-slate-300">切り上げ満貫<input type="checkbox" checked={kiriage} onChange={(event) => setKiriage(event.target.checked)} className="h-4 w-4 accent-cyan-400" /></label></div>}
+
            <div className="rounded-xl border border-amber-400/25 bg-gradient-to-br from-[#17263c] to-[#0c1729] p-4"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold tracking-[0.18em] text-amber-300">ESTIMATED PAYMENT</p><p className="mt-1 text-xs text-slate-400">{handType === 'yakuman' ? '役満' : `${handType === 'chiitoi' ? 25 : fu}符 ${han}翻`} / {isParent ? '親' : '子'} {winType === 'ron' ? 'ロン' : 'ツモ'}</p></div><p className="text-2xl font-black tabular-nums text-amber-300">{result.total.toLocaleString('ja-JP')}<span className="ml-1 text-xs">点</span></p></div><div className="mt-3 grid grid-cols-2 gap-2">{result.payments.map((payment) => <div key={payment.player} className="rounded-lg bg-black/20 px-3 py-2 text-xs"><span className="text-slate-500">{payment.player}</span><strong className="float-right text-slate-200">-{payment.amount.toLocaleString('ja-JP')}</strong></div>)}</div>{riichiStick > 0 && <p className="mt-3 text-center text-[11px] text-red-300">＋ 供託リーチ棒 {riichiStick.toLocaleString('ja-JP')}点</p>}</div>
            <button type="button" onClick={applyWin} className="w-full rounded-xl bg-cyan-500 py-3.5 text-sm font-black text-[#04111f] shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300">点数を反映する</button><div className="grid grid-cols-2 gap-2"><button type="button" onClick={undo} disabled={history.length === 0} className="rounded-lg border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40">↶ 取り消す</button><button type="button" onClick={resetScores} className="rounded-lg border border-red-900/70 bg-red-950/40 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-950">リセット</button></div>
          </div>
        </section>
        <p className="rounded-xl border border-slate-800 bg-[#0b1a2e]/70 px-4 py-3 text-center text-xs text-slate-400">{log}</p><p className="pb-2 text-center text-[10px] text-slate-600">点数は100点単位で切り上げ。供託は反映時に勝者へ加算。</p>
      </div>
    </main>
  );
}
