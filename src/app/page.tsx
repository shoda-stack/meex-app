"use client";
import React, { useState, useEffect, useRef } from 'react';
// 新しいQRコード生成ツール
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
  // お絵描きするための「キャンバス」の参照
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const GAS_URL = "https://script.google.com/macros/s/AKfycbzkBZ7OiY2_rJL7TSlJ533mpHHrn0gLTI_H40YPru_gtIFz9Z907sqVojAAdLuwbDsg/exec"; 

  // チケット画面になったら、一枚の画像を描き上げる
  useEffect(() => {
    if (view === 'ticket' && formData.id && canvasRef.current) {
      const generateTicketImage = async () => {
        try {
          const canvas = canvasRef.current!;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // --- 1. キャンバスの準備（高画質設定） ---
          const width = 600;
          const height = 800;
          canvas.width = width;
          canvas.height = height;

          // 全体を背景色で塗りつぶす
          ctx.fillStyle = '#f3b32a';
          ctx.fillRect(0, 0, width, height);

          // チケット本体の位置とサイズ
          const ticketX = 50;
          const ticketY = 50;
          const ticketWidth = width - 100;
          const ticketHeight = height - 150;

          // --- 2. 影を描く ---
          ctx.fillStyle = '#000000';
          ctx.fillRect(ticketX + 14, ticketY + 14, ticketWidth, ticketHeight);

          // --- 3. チケットの白い紙を描く ---
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ticketX, ticketY, ticketWidth, ticketHeight);

          // --- 4. 黒い太枠を描く ---
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.strokeRect(ticketX, ticketY, ticketWidth, ticketHeight);

          // --- 5. 名前を書く ---
          ctx.fillStyle = '#000000';
          // 斜体・太字・サイズを設定
          ctx.font = 'italic bold 48px sans-serif';
          ctx.textAlign = 'center';
          // 名前が長すぎる場合は省略させる設定
          const nameText = `${formData.name} 様`;
          const maxWidth = ticketWidth - 40;
          let metrics = ctx.measureText(nameText);
          let printableName = nameText;
          if (metrics.width > maxWidth) {
             printableName = formData.name.substring(0, 10) + "... 様";
          }
          ctx.fillText(printableName, width / 2, ticketY + 100);

          // 名前の下の線
          ctx.beginPath();
          ctx.moveTo(ticketX + 40, ticketY + 125);
          ctx.lineTo(ticketX + ticketWidth - 40, ticketY + 125);
          ctx.lineWidth = 4;
          ctx.stroke();

          // --- 6. QRコードを生成して貼り付ける ---
          const qrSize = 300;
          // QRコードの画像データを作成
          const qrUrl = await QRCode.toDataURL(formData.id, { width: qrSize, margin: 1 });
          const qrImg = new Image();
          // 画像の読み込みが終わったら描画する
          qrImg.onload = () => {
            // QRを囲む細い枠
            const qrBoxY = ticketY + 160;
            ctx.lineWidth = 2;
            ctx.strokeRect((width - qrSize) / 2 - 5, qrBoxY - 5, qrSize + 10, qrSize + 10);
            // QRコードを描画
            ctx.drawImage(qrImg, (width - qrSize) / 2, qrBoxY);

            // --- 7. チケット名（黒帯）を描く ---
            const labelY = qrBoxY + qrSize + 40;
            ctx.fillStyle = '#000000';
            ctx.fillRect(ticketX + 20, labelY, ticketWidth - 40, 60);
            
            // チケット名の文字（黄色）
            ctx.fillStyle = '#f3b32a';
            ctx.font = 'italic bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('1 DRINK TICKET', width / 2, labelY + 30);

            // --- 8. 下部のイベント情報を書く ---
            ctx.fillStyle = '#000000';
            ctx.font = 'italic 12px sans-serif';
            ctx.globalAlpha = 0.5; // 少し薄くする
            ctx.fillText('2.13 FRI @BAR REEF', width / 2, ticketY + ticketHeight + 40);
            ctx.globalAlpha = 1.0; // 元に戻す

            // --- 9. 完成した絵を画像データとして保存 ---
            setTicketImageUrl(canvas.toDataURL('image/png'));
          };
          // QR画像の読み込みを開始
          qrImg.src = qrUrl;

        } catch (err) {
          console.error("画像生成エラー:", err);
        }
      };
      // お絵描き実行！
      generateTicketImage();
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

  // --- 管理者機能（変更なし）---
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
    // 全体のデザイン（背景色など）はCSSで維持
    <div className="min-h-screen bg-[#f3b32a] font-sans overflow-x-hidden flex flex-col items-center">
      
      {/* 登録画面（変更なし） */}
      {view === 'register' && (
        <div className="w-full max-w-sm p-6 text-center mt-12">
          <header className="mb-10 text-black font-bold">
            <h1 className="text-8xl italic tracking-tighter leading-none">Meex</h1>
            <p className="text-[10px] tracking-[0.3em] border-y-2 border-black py-1 mt-2 inline-block px-4 font-black uppercase tracking-widest text-[9px]">Vol.1 @ Bar Reef</p>
          </header>
          <div className="bg-black text-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-left font-bold">
            <h2 className="text-2xl mb-8 italic text-[#f3b32a]">混ざりに行く。</h2>
            <form onSubmit={handleRegister} className="space-y-6 text-black">
              <input type="text" placeholder="お名前" required className="w-full p-4 bg-[#f3b32a] border-none" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <input type="text" placeholder="連絡先" required className="w-full p-4 bg-[#f3b32a] border-none" onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
              <button type="submit" disabled={loading} className="w-full bg-white text-black p-5 text-xl font-black mt-4 uppercase">Ticket発行</button>
            </form>
            <button onClick={() => setView('admin-login')} className="mt-10 text-[10px] opacity-20 underline italic uppercase block w-full text-center">Staff Only</button>
          </div>
        </div>
      )}

      {/* チケット画面 */}
      {view === 'ticket' && (
        <div className="w-full max-w-md p-4 text-center mt-8">
          {/* お絵描きするための作業台（ユーザーには見せない） */}
          <canvas ref={canvasRef} className="hidden"></canvas>

          {/* 完成した画像を表示する */}
          {ticketImageUrl ? (
            <div className="animate-in fade-in duration-500">
              {/* これが長押し保存される画像本体 */}
              <img src={ticketImageUrl} alt="Ticket" className="w-full h-auto shadow-2xl" />
              
              {/* 保存の案内 */}
              <div className="bg-red-50 p-4 border-2 border-red-600 rounded-lg text-left mt-8 mx-4 font-bold text-black">
                <p className="font-black text-red-600 text-lg mb-2 underline decoration-2">📸 写真(アルバム)に保存する</p>
                <p className="text-sm leading-relaxed">
                  上の<span className="bg-yellow-200 px-1">チケット画像を「長押し」</span>してください。<br/>
                  メニューから<span className="text-blue-600 underline">「"写真"に保存」</span>を選択！
                </p>
              </div>
            </div>
          ) : (
            // 画像ができるまでのローディング表示
            <div className="mt-20 italic animate-pulse font-black text-xl text-black">チケット画像を作成中...</div>
          )}
        </div>
      )}

      {/* 管理者ログイン・スキャン画面（変更なし） */}
      {view === 'admin-login' && (
        <div className="w-full max-w-sm bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] text-black font-bold mt-20 text-center">
          <h2 className="text-2xl mb-6 italic border-b-2 border-black pb-2 uppercase tracking-widest">Staff Login</h2>
          <input type="password" placeholder="Pass" className="w-full p-4 border-4 border-black mb-4 text-center text-xl font-bold" value={passcode} onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (passcode === "meex0213" ? setView('admin') : alert("NG"))} />
          <button onClick={() => passcode === "meex0213" ? setView('admin') : alert("NG")} className="w-full bg-black text-white p-4 uppercase text-xl font-bold">Unlock</button>
        </div>
      )}

      {view === 'admin' && (
        <div className="w-full max-w-sm bg-white p-8 border-[6px] border-black shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] text-black font-bold mt-20 text-center">
          <h2 className="text-2xl mb-6 italic border-b-2 border-black pb-2 uppercase tracking-widest">Scanner</h2>
          <div id="reader" className="w-full mb-4 bg-black min-h-[200px] overflow-hidden rounded-lg border-4 border-black"></div>
          {adminStatus === "待機中" ? (
            <button onClick={startScanning} className="w-full bg-blue-600 text-white p-6 rounded-lg font-black uppercase text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">カメラ起動</button>
          ) : adminStatus === "確認完了" && scanResult ? (
            <div className="space-y-4 text-left">
              <div className="text-3xl border-b-4 border-black pb-2 text-center truncate">{scanResult.name} 様</div>
              <div className={`text-xl p-2 font-black text-center ${scanResult.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {scanResult.status === 'available' ? '✅ 未使用' : '⚠️ 使用済み'}
              </div>
              {scanResult.status === 'available' ? (
                <button onClick={handleRedeem} className="w-full bg-red-600 text-white p-6 rounded-lg font-black uppercase text-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 text-center w-full">使用する</button>
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
      <footer className="mt-auto py-12 text-[9px] tracking-[0.4em] opacity-40 uppercase font-normal leading-loose text-center font-bold">Craftbank × Spicecurry Hozan<br/>Stay Mixed, Stay Connected.</footer>
    </div>
  );
}