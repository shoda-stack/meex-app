"use client";
import React, { useState, useEffect } from 'react';
import liff from '@line/liff';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';

export default function MeexApp() {
  const [view, setView] = useState('register'); 
  const [formData, setFormData] = useState({ name: '', contact: '', id: '' });
  const [adminStatus, setAdminStatus] = useState('待機中'); // 待機中, 確認中, 済, 使用済み, 無効
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  const GAS_URL = "https://script.google.com/macros/s/AKfycbzkBZ7OiY2_rJL7TSlJ533mpHHrn0gLTI_H40YPru_gtIFz9Z907sqVojAAdLuwbDsg/exec"; 
  const MY_LIFF_ID = "2008941664-iteSq7Q1";

  useEffect(() => {
    liff.init({ liffId: MY_LIFF_ID }).catch(err => console.error(err));
  }, []);

  const startScanning = async () => {
    const html5QrCode = new Html5Qrcode("reader");
    setScanner(html5QrCode);
    setAdminStatus("待機中");

    try {
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 20, qrbox: (viewWidth, viewHeight) => ({ width: viewWidth * 0.7, height: viewWidth * 0.7 }) },
        (decodedText) => { if (navigator.vibrate) navigator.vibrate(200); handleRedeem(decodedText); },
        (errorMessage) => {}
      );
    } catch (err) { setAdminStatus("カメラエラー"); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "register", name: formData.name, contact: formData.contact }) });
      const result = await res.json();
      if (result.status === "success") { setFormData({ ...formData, id: result.id }); setView('ticket'); }
    } catch (error) { alert("通信エラー。"); } finally { setLoading(false); }
  };

  const handleRedeem = async (scanId: string) => {
    // 「待機中」の時だけスキャンを受け付ける（連続スキャン防止）
    if (adminStatus !== "待機中") return;

    setAdminStatus("確認中...");
    try {
      const res = await fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "redeem", id: scanId }) });
      const result = await res.json();
      if (result.status === "redeemed") setAdminStatus("済");
      else if (result.status === "already_used") setAdminStatus("使用済み");
      else setAdminStatus("無効");
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

      {view === 'register' && (
        <div className="w-full max-w-sm bg-black text-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl mb-8 italic text-[#f3b32a] text-left">混ざりに行く。</h2>
          <form onSubmit={handleRegister} className="space-y-6 text-left">
            <input type="text" placeholder="お名前" required className="w-full p-4 bg-[#f3b32a] text-black border-none" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <input type="text" placeholder="連絡先" required className="w-full p-4 bg-[#f3b32a] text-black border-none" onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
            <button type="submit" disabled={loading} className="w-full bg-white text-black p-5 text-xl font-black mt-4 uppercase">Ticket発行</button>
          </form>
          <button onClick={() => setView('admin-login')} className="mt-10 text-[10px] opacity-20 underline italic uppercase block w-full text-center">Staff Only</button>
        </div>
      )}

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

      {view === 'admin-login' && (
        <div className="w-full max-w-sm bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl mb-6 italic border-b-2 border-black pb-2 text-center uppercase">Staff Login</h2>
          <input type="password" placeholder="Passcode" className="w-full p-4 border-4 border-black mb-4 text-center text-xl" value={passcode} onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} />
          <button onClick={handleUnlock} className="w-full bg-black text-white p-4 mb-4 uppercase text-xl">Unlock</button>
        </div>
      )}

      {view === 'admin' && (
        <div className="w-full max-w-sm bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl mb-6 italic border-b-2 border-black pb-2 text-center">SCANNER</h2>
          <div id="reader" className="w-full mb-4 bg-black min-h-[250px] overflow-hidden rounded-lg border-4 border-black"></div>
          
          {adminStatus === "待機中" ? (
            <button onClick={startScanning} className="w-full bg-blue-600 text-white p-6 rounded-lg font-black uppercase text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">カメラ起動</button>
          ) : adminStatus === "確認中..." ? (
            <div className="w-full bg-gray-200 text-black p-6 rounded-lg text-2xl italic">CHECKING...</div>
          ) : (
            <button onClick={() => setAdminStatus("待機中")} className="w-full bg-green-500 text-white p-6 rounded-lg font-black uppercase text-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">次へ</button>
          )}

          <div className={`text-5xl mt-8 mb-4 font-black italic tracking-tighter ${adminStatus === '済' ? 'text-green-600' : 'text-red-600'}`}>
            {adminStatus === '済' ? 'DONE' : adminStatus === '使用済み' ? 'USED' : adminStatus === '無効' ? 'INVALID' : ''}
          </div>
          
          <button onClick={() => { if(scanner) scanner.stop(); setView('register'); }} className="mt-8 text-sm underline text-gray-400 uppercase">Logout</button>
        </div>
      )}

      <footer className="mt-auto py-12 text-[9px] tracking-[0.4em] opacity-40 uppercase font-normal leading-loose">Craftbank × Spicecurry Hozan<br/>Stay Mixed, Stay Connected.</footer>
    </div>
  );
}