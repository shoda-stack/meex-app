"use client";
import React, { useState, useEffect } from 'react';
import liff from '@line/liff';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';

export default function MeexApp() {
  const [view, setView] = useState('register'); 
  const [formData, setFormData] = useState({ name: '', contact: '', id: '' });
  const [adminStatus, setAdminStatus] = useState('待機中'); // 待機中, 照合中, 確認完了, 消し込み中, 完了, エラー
  const [scanResult, setScanResult] = useState<{name: string, id: string, status: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  // あなたの新しいGAS URLとLIFF ID
  const GAS_URL = "https://script.google.com/macros/s/AKfycbzkBZ7OiY2_rJL7TSlJ533mpHHrn0gLTI_H40YPru_gtIFz9Z907sqVojAAdLuwbDsg/exec"; 
  const MY_LIFF_ID = "2008941664-iteSq7Q1";

  useEffect(() => {
    liff.init({ liffId: MY_LIFF_ID }).catch(err => console.error(err));
  }, []);

  const startScanning = async () => {
    const html5QrCode = new Html5Qrcode("reader");
    setScanner(html5QrCode);
    setAdminStatus("待機中");
    setScanResult(null);

    try {
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 20, qrbox: (viewWidth, viewHeight) => ({ width: viewWidth * 0.7, height: viewWidth * 0.7 }) },
        (decodedText) => { if (navigator.vibrate) navigator.vibrate(200); handleCheck(decodedText); },
        (errorMessage) => {}
      );
    } catch (err) { setAdminStatus("カメラエラー"); }
  };

  // 1. スキャンしたQRが有効かチェックする
  const handleCheck = async (scanId: string) => {
    if (adminStatus !== "待機中") return;
    setAdminStatus("照合中...");
    try {
      const res = await fetch(GAS_URL, { 
        method: "POST", 
        body: JSON.stringify({ action: "check", id: scanId }) 
      });
      const result = await res.json();
      setScanResult({ name: result.name, id: scanId, status: result.status });
      setAdminStatus("確認完了");
    } catch (error) { setAdminStatus("通信エラー"); }
  };

  // 2. 「チケットを使用する」ボタンで消し込みを確定する
  const handleRedeem = async () => {
    if (!scanResult) return;
    setAdminStatus("消し込み中...");
    try {
      const res = await fetch(GAS_URL, { 
        method: "POST", 
        body: JSON.stringify({ action: "redeem", id: scanResult.id }) 
      });
      const result = await res.json();
      if (result.status === "success") setAdminStatus("完了");
      else setAdminStatus("エラー");
    } catch (error) { setAdminStatus("通信エラー"); }
  };

  const handleUnlock = () => {
    if (passcode === "meex0213") { setView('admin'); setPasscode(''); }
    else { alert("IDが正しくありません"); }
  };

  return (
    <div className="min-h-screen bg-[#f3b32a] text-black font-bold p-6 flex flex-col items-center text-center font-sans">
      <header className="mb-10 mt-12">
        <h1 className="text-8xl italic tracking-tighter leading-none">Meex</h1>
        <p className="text-[10px] tracking-[0.3em] border-y-2 border-black py-1 mt-2 inline-block px-4 font-black">VOL.1 @ BAR REEF</p>
      </header>

      {/* 登録画面 */}
      {view === 'register' && (
        <div className="w-full max-w-sm bg-black text-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl mb-8 italic text-[#f3b32a] text-left">混ざりに行く。</h2>
          <form onSubmit={(e) => { e.preventDefault(); setLoading(true); fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "register", name: formData.name, contact: formData.contact }) }).then(res => res.json()).then(result => { setFormData({ ...formData, id: result.id }); setView('ticket'); }).finally(() => setLoading(false)); }} className="space-y-6 text-left">
            <input type="text" placeholder="お名前" required className="w-full p-4 bg-[#f3b32a] text-black border-none" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <input type="text" placeholder="連絡先" required className="w-full p-4 bg-[#f3b32a] text-black border-none" onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
            <button type="submit" disabled={loading} className="w-full bg-white text-black p-5 text-xl font-black mt-4 uppercase tracking-tighter">Ticket発行</button>
          </form>
          <button onClick={() => setView('admin-login')} className="mt-10 text-[10px] opacity-20 underline italic uppercase block w-full text-center">Staff Only</button>
        </div>
      )}

      {/* チケット画面 */}
      {view === 'ticket' && (
        <div className="w-full max-w-sm">
          <div className="bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-5xl mb-8 border-b-4 border-black pb-4 italic tracking-tighter">{formData.name} 様</h2>
            <div className="bg-white p-4 inline-block mb-6 border-2 border-black">
              <QRCodeCanvas value={formData.id} size={180} />
            </div>
            <div className="bg-black text-[#f3b32a] py-4 px-2 text-xl font-black italic leading-tight uppercase">1 Drink Ticket</div>
          </div>
        </div>
      )}

      {/* スタッフログイン */}
      {view === 'admin-login' && (
        <div className="w-full max-w-sm bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl mb-6 italic border-b-2 border-black pb-2 text-center uppercase">Staff Login</h2>
          <input type="password" placeholder="Passcode" className="w-full p-4 border-4 border-black mb-4 text-center text-xl" value={passcode} onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} />
          <button onClick={handleUnlock} className="w-full bg-black text-white p-4 mb-4 uppercase text-xl">Unlock</button>
        </div>
      )}

      {/* スキャナー画面 */}
      {view === 'admin' && (
        <div className="w-full max-w-sm bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl mb-6 italic border-b-2 border-black pb-2 text-center">SCANNER</h2>
          <div id="reader" className="w-full mb-4 bg-black min-h-[200px] overflow-hidden rounded-lg border-4 border-black"></div>
          
          {adminStatus === "待機中" ? (
            <button onClick={startScanning} className="w-full bg-blue-600 text-white p-6 rounded-lg font-black uppercase text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">カメラ起動</button>
          ) : adminStatus === "確認完了" && scanResult ? (
            <div className="space-y-4">
              <div className="text-3xl border-b-4 border-black pb-2 tracking-tighter">{scanResult.name} 様</div>
              <div className={`text-xl p-2 font-black ${scanResult.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {scanResult.status === 'available' ? '✅ チケット有効' : '⚠️ 使用済み'}
              </div>
              {scanResult.status === 'available' ? (
                <button onClick={handleRedeem} className="w-full bg-red-600 text-white p-6 rounded-lg font-black uppercase text-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">チケットを使用</button>
              ) : (
                <button onClick={() => setAdminStatus("待機中")} className="w-full bg-black text-white p-6 rounded-lg font-black uppercase text-2xl">次へ</button>
              )}
            </div>
          ) : adminStatus === "完了" ? (
            <div className="space-y-6">
              <div className="text-8xl text-green-600 italic leading-none">DONE</div>
              <button onClick={() => setAdminStatus("待機中")} className="w-full bg-green-500 text-white p-6 rounded-lg font-black uppercase text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">次へ進む</button>
            </div>
          ) : (
            <div className="p-10 italic text-2xl animate-pulse text-gray-400">{adminStatus}</div>
          )}
          
          <button onClick={() => { if(scanner) scanner.stop(); setView('register'); }} className="mt-8 text-xs underline text-gray-400 uppercase block w-full text-center">Logout</button>
        </div>
      )}

      <footer className="mt-auto py-12 text-[9px] tracking-[0.4em] opacity-40 uppercase font-normal leading-loose">Craftbank × Spicecurry Hozan<br/>Stay Mixed, Stay Connected.</footer>
    </div>
  );
}