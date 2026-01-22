"use client";
import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';

export default function MeexApp() {
  const [view, setView] = useState('register'); 
  const [formData, setFormData] = useState({ name: '', contact: '', id: '' });
  const [adminStatus, setAdminStatus] = useState('待機中'); 
  const [scanResult, setScanResult] = useState<{name: string, id: string, status: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  
  const [ticketImageUrl, setTicketImageUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const GAS_URL = "https://script.google.com/macros/s/AKfycbzkBZ7OiY2_rJL7TSlJ533mpHHrn0gLTI_H40YPru_gtIFz9Z907sqVojAAdLuwbDsg/exec"; 

  // チケット画面になったら、一枚の画像（名前+QR+文字）を描き上げる
  useEffect(() => {
    if (view === 'ticket' && formData.id && canvasRef.current) {
      const drawTicket = async () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 解像度を高める設定
        canvas.width = 600;
        canvas.height = 850;

        // 1. 背景（Meexイエロー）
        ctx.fillStyle = '#f3b32a';
        ctx.fillRect(0, 0, 600, 850);

        // 2. チケットの白い台紙（影付き）
        ctx.fillStyle = '#000000';
        ctx.fillRect(64, 64, 500, 700); // 影
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(50, 50, 500, 700); // 本体
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        ctx.strokeRect(50, 50, 500, 700); // 枠

        // 3. 名前を描く
        ctx.fillStyle = '#000000';
        ctx.font = 'italic bold 56px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${formData.name} 様`, 300, 160);

        // 名前の下の線
        ctx.beginPath();
        ctx.moveTo(100, 190);
        ctx.lineTo(500, 190);
        ctx.lineWidth = 4;
        ctx.stroke();

        // 4. QRコードを生成して合成する
        try {
          const qrDataUrl = await QRCode.toDataURL(formData.id, { 
            margin: 1, 
            width: 320,
            color: { dark: '#000000', light: '#ffffff' }
          });
          const qrImg = new Image();
          qrImg.onload = () => {
            // QRコードの枠
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(135, 245, 330, 330);
            // QRコード本体
            ctx.drawImage(qrImg, 140, 250, 320, 320);

            // 5. 下部の黒帯と「1 DRINK TICKET」
            ctx.fillStyle = '#000000';
            ctx.fillRect(80, 620, 440, 80);
            ctx.fillStyle = '#f3b32a';
            ctx.font = 'italic bold 32px sans-serif';
            ctx.fillText('1 DRINK TICKET', 300, 672);

            // 6. 日付
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 16px sans-serif';
            ctx.globalAlpha = 0.4;
            ctx.fillText('2.13 FRI @BAR REEF', 300, 730);

            // 7. 完成したキャンバスを画像(DataURL)に変換
            setTicketImageUrl(canvas.toDataURL('image/png'));
          };
          qrImg.src = qrDataUrl;
        } catch (err) {
          console.error(err);
        }
      };
      drawTicket();
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
    <div className="min-h-screen bg-[#f3b32a] font-sans overflow-x-hidden flex flex-col items-center select-none text-black font-bold">
      <header className="mb-10 mt-12 text-center">
        <h1 className="text-8xl italic tracking-tighter leading-none">Meex</h1>
        <p className="text-[10px] tracking-[0.3em] border-y-2 border-black py-1 mt-2 inline-block px-4 font-black uppercase">Vol.1 @ Bar Reef</p>
      </header>

      {view === 'register' && (
        <div className="w-full max-w-sm p-6 text-center">
          <div className="bg-black text-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-left">
            <h2 className="text-2xl mb-8 italic text-[#f3b32a]">混ざりに行く。</h2>
            <form onSubmit={handleRegister} className="space-y-6 text-black">
              <input type="text" placeholder="お名前" required className="w-full p-4 bg-[#f3b32a] border-none font-bold" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <input type="text" placeholder="連絡先" required className="w-full p-4 bg-[#f3b32a] border-none font-bold" onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
              <button type="submit" disabled={loading} className="w-full bg-white text-black p-5 text-xl font-black mt-4 uppercase active:bg-gray-200">Ticket発行</button>
            </form>
            <button onClick={() => setView('admin-login')} className="mt-10 text-[10px] opacity-20 underline italic uppercase block w-full text-center text-white">Staff Only</button>
          </div>
        </div>
      )}

      {view === 'ticket' && (
        <div className="w-full max-w-md p-4 text-center">
          {/* 画像生成用の隠しキャンバス */}
          <canvas ref={canvasRef} className="hidden"></canvas>

          {ticketImageUrl ? (
            <div className="animate-in fade-in duration-500">
              {/* 合成された1枚のチケット画像 */}
              <img src={ticketImageUrl} alt="Ticket" className="w-full h-auto shadow-[20px_20px_0px_0px_rgba(0,0,0,0.2)]" />
              
              <div className="bg-red-50 p-5 border-2 border-red-600 rounded-lg text-left mt-10 mx-2">
                <p className="font-black text-red-600 text-lg mb-2 underline decoration-2">📸 写真(アルバム)に保存する</p>
                <p className="text-sm leading-relaxed">
                  上の<span className="bg-yellow-200 px-1 text-black">チケット画像を「長押し」</span>してください。<br/>
                  メニューから<span className="text-blue-600 font-black">「"写真"に保存」</span>を選択！
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-20 italic animate-pulse font-black text-xl">チケット画像を生成中...</div>
          )}
        </div>
      )}

      {/* 管理者ログイン・スキャン画面（省略せず維持） */}
      {view === 'admin-login' && (
        <div className="w-full max-w-sm bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] mt-20">
          <h2 className="text-2xl mb-6 italic border-b-2 border-black pb-2 uppercase text-center">Staff Login</h2>
          <input type="password" placeholder="Pass" className="w-full p-4 border-4 border-black mb-4 text-center text-xl font-bold" value={passcode} onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (passcode === "meex0213" ? setView('admin') : alert("NG"))} />
          <button onClick={() => passcode === "meex0213" ? setView('admin') : alert("NG")} className="w-full bg-black text-white p-4 uppercase text-xl font-bold">Unlock</button>
        </div>
      )}

      {view === 'admin' && (
        <div className="w-full max-w-sm bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] mt-20">
          <h2 className="text-2xl mb-6 italic border-b-2 border-black pb-2 uppercase tracking-widest text-center">Scanner</h2>
          <div id="reader" className="w-full mb-4 bg-black min-h-[200px] overflow-hidden rounded-lg border-4 border-black"></div>
          {adminStatus === "待機中" ? (
            <button onClick={startScanning} className="w-full bg-blue-600 text-white p-6 rounded-lg font-black uppercase text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">カメラ起動</button>
          ) : adminStatus === "確認完了" && scanResult ? (
            <div className="space-y-4">
              <div className="text-3xl border-b-4 border-black pb-2 text-center truncate">{scanResult.name} 様</div>
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
            <div className="p-10 italic text-2xl animate-pulse text-gray-400 text-center">{adminStatus}</div>
          )}
          <button onClick={() => { if(scanner) scanner.stop(); setView('register'); }} className="mt-8 text-xs underline text-gray-400 uppercase block w-full text-center">Logout</button>
        </div>
      )}
      <footer className="mt-auto py-12 text-[9px] tracking-[0.4em] opacity-40 uppercase font-normal leading-loose text-center">Craftbank × Spicecurry Hozan<br/>Stay Mixed, Stay Connected.</footer>
    </div>
  );
}