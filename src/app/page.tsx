"use client";
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
// 画面を画像に変換するツールをインポート
import html2canvas from 'html2canvas';

export default function MeexApp() {
  const [view, setView] = useState('register'); 
  const [formData, setFormData] = useState({ name: '', contact: '', id: '' });
  const [adminStatus, setAdminStatus] = useState('待機中'); 
  const [scanResult, setScanResult] = useState<{name: string, id: string, status: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  
  // 生成されたチケット画像のURLを入れる変数
  const [ticketImageUrl, setTicketImageUrl] = useState<string>("");
  // 画像化する範囲を指定するための参照
  const ticketRef = useRef<HTMLDivElement>(null);

  const GAS_URL = "https://script.google.com/macros/s/AKfycbzkBZ7OiY2_rJL7TSlJ533mpHHrn0gLTI_H40YPru_gtIFz9Z907sqVojAAdLuwbDsg/exec"; 

  // チケット表示時に、チケット全体を画像に変換する
  useEffect(() => {
    if (view === 'ticket' && formData.id && ticketRef.current) {
      // QRコードの描画を少し待ってから画像化を実行
      const timer = setTimeout(() => {
        if (ticketRef.current) {
          html2canvas(ticketRef.current, {
            backgroundColor: null, // 背景色を透明に（元のースタイルを維持）
            scale: 2, // 高解像度できれいにキャプチャ
          }).then((canvas) => {
            setTicketImageUrl(canvas.toDataURL("image/png"));
          });
        }
      }, 800); // 0.8秒待つ
      return () => clearTimeout(timer);
    }
  }, [view, formData.id]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "register", name: formData.name, contact: formData.contact }) });
      const result = await res.json();
      if (result.status === "success") { setFormData({ ...formData, id: result.id }); setView('ticket'); }
    } catch (error) { alert("通信エラー"); } finally { setLoading(false); }
  };

  // --- 管理者機能 ---
  const startScanning = async () => {
    const html5QrCode = new Html5Qrcode("reader");
    setScanner(html5QrCode);
    setAdminStatus("待機中");
    try {
      await html5QrCode.start({ facingMode: "environment" }, { fps: 20, qrbox: (w) => ({ width: w * 0.7, height: w * 0.7 }) }, (text) => handleCheck(text), () => {});
    } catch (err) { setAdminStatus("カメラ起動エラー"); }
  };
  const handleCheck = async (scanId: string) => {
    if (adminStatus !== "待機中") return;
    setAdminStatus("照合中...");
    try {
      const res = await fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "check", id: scanId }) });
      const result = await res.json();
      setScanResult({ name: result.name || "不明", id: scanId, status: result.status });
      setAdminStatus("確認完了");
    } catch (error) { setAdminStatus("通信エラー"); }
  };
  const handleRedeem = async () => {
    if (!scanResult) return;
    setAdminStatus("消し込み中...");
    try {
      const res = await fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "redeem", id: scanResult.id }) });
      const result = await res.json();
      setAdminStatus(result.status === "success" ? "完了" : "エラー");
    } catch (error) { setAdminStatus("通信エラー"); }
  };

  return (
    <div className="min-h-screen bg-[#f3b32a] text-black font-bold p-6 flex flex-col items-center text-center font-sans select-none">
      <header className="mb-10 mt-12">
        <h1 className="text-8xl italic tracking-tighter leading-none">Meex</h1>
        <p className="text-[10px] tracking-[0.3em] border-y-2 border-black py-1 mt-2 inline-block px-4 font-black uppercase tracking-widest text-[9px]">Vol.1 @ Bar Reef</p>
      </header>

      {view === 'register' && (
        <div className="w-full max-w-sm bg-black text-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-left">
          <h2 className="text-2xl mb-8 italic text-[#f3b32a]">混ざりに行く。</h2>
          <form onSubmit={handleRegister} className="space-y-6 text-black font-bold">
            <input type="text" placeholder="お名前" required className="w-full p-4 bg-[#f3b32a] border-none" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <input type="text" placeholder="連絡先" required className="w-full p-4 bg-[#f3b32a] border-none" onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
            <button type="submit" disabled={loading} className="w-full bg-white text-black p-5 text-xl font-black mt-4 uppercase">Ticket発行</button>
          </form>
          <button onClick={() => setView('admin-login')} className="mt-10 text-[10px] opacity-20 underline italic uppercase block w-full text-center">Staff Only</button>
        </div>
      )}

      {view === 'ticket' && (
        <div className="w-full max-w-sm">
          {/* 画像が生成されるまでは、元のDOMを表示（これをキャプチャする） */}
          {!ticketImageUrl && (
            <div ref={ticketRef} className="bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-5xl mb-8 border-b-4 border-black pb-4 italic tracking-tighter truncate">{formData.name} 様</h2>
              <div className="bg-white p-4 inline-block mb-6 border-2 border-black">
                <QRCodeCanvas value={formData.id} size={180} />
              </div>
              <div className="bg-black text-[#f3b32a] py-4 px-2 text-xl font-black italic uppercase leading-tight">1 Drink Ticket</div>
            </div>
          )}

          {/* 画像生成中・生成後の表示 */}
          <div className="mt-8">
            {ticketImageUrl ? (
              // 生成された画像を表示（これを長押しさせる）
              <div className="shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] border-[6px] border-black">
                <img src={ticketImageUrl} alt="Ticket" className="w-full h-auto pointer-events-auto" />
              </div>
            ) : (
              // 画像生成中のローディング
              <div className="w-full h-[400px] flex items-center justify-center italic opacity-50 text-lg font-black animate-pulse">
                チケット画像を生成中...
              </div>
            )}
          </div>
          
          {/* 保存ガイド */}
          {ticketImageUrl && (
            <div className="bg-red-50 p-4 border-2 border-red-600 rounded-lg text-left mt-8">
              <p className="font-black text-red-600 text-lg mb-2 underline decoration-2">📸 写真(アルバム)に保存する</p>
              <p className="text-sm font-bold leading-relaxed">
                上の<span className="bg-yellow-200 px-1">チケット画像を「長押し」</span>してください。<br/>
                メニューが出たら<span className="text-blue-600 underline">「"写真"に保存」</span>を選択！
              </p>
              <div className="mt-4 pt-4 border-t border-red-200 text-[10px] opacity-60 font-normal">
                ※長押しができない場合は、スクリーンショットを撮って保存してください。
              </div>
            </div>
          )}
          
          <p className="mt-8 text-xs opacity-50 italic">2.13 FRI @BAR REEF</p>
        </div>
      )}

      {/* スタッフ用画面（変更なし） */}
      {view === 'admin-login' && (
        <div className="w-full max-w-sm bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] text-black">
          <h2 className="text-2xl mb-6 italic border-b-2 border-black pb-2 uppercase tracking-widest text-center">Staff Login</h2>
          <input type="password" placeholder="Pass" className="w-full p-4 border-4 border-black mb-4 text-center text-xl font-bold" value={passcode} onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (passcode === "meex0213" ? setView('admin') : alert("NG"))} />
          <button onClick={() => passcode === "meex0213" ? setView('admin') : alert("NG")} className="w-full bg-black text-white p-4 uppercase text-xl font-bold">Unlock</button>
        </div>
      )}

      {view === 'admin' && (
        <div className="w-full max-w-sm bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] text-black font-bold">
          <h2 className="text-2xl mb-6 italic border-b-2 border-black pb-2 uppercase tracking-widest">Scanner</h2>
          <div id="reader" className="w-full mb-4 bg-black min-h-[200px] overflow-hidden rounded-lg border-4 border-black"></div>
          {adminStatus === "待機中" ? (
            <button onClick={startScanning} className="w-full bg-blue-600 text-white p-6 rounded-lg font-black uppercase text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">カメラ起動</button>
          ) : adminStatus === "確認完了" && scanResult ? (
            <div className="space-y-4 text-left">
              <div className="text-3xl border-b-4 border-black pb-2 text-center">{scanResult.name} 様</div>
              <div className={`text-xl p-2 font-black text-center ${scanResult.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {scanResult.status === 'available' ? '✅ 未使用' : '⚠️ 使用済み'}
              </div>
              {scanResult.status === 'available' ? (
                <button onClick={handleRedeem} className="w-full bg-red-600 text-white p-6 rounded-lg font-black uppercase text-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">使用する</button>
              ) : (
                <button onClick={() => setAdminStatus("待機中")} className="w-full bg-black text-white p-6 rounded-lg font-black uppercase text-2xl w-full">次へ</button>
              )}
            </div>
          ) : adminStatus === "完了" ? (
            <div className="space-y-6"><div className="text-8xl text-green-600 italic leading-none font-black text-center">DONE</div><button onClick={() => setAdminStatus("待機中")} className="w-full bg-green-500 text-white p-6 rounded-lg font-black uppercase text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">次へ進む</button></div>
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