import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe } from 'lucide-react';
import Card from './Card';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpContent = {
  en: {
    title: 'Help & Documentation',
    sections: [
      {
        title: 'Google Sign-In Issues',
        content: (
          <div className="space-y-2 text-sm bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800">
            <h4 className="font-bold text-yellow-800 dark:text-yellow-200">"Google hasn't verified this app"</h4>
            <p>If you see a scary warning screen when signing in, don't worry. This happens because the app is in "Testing Mode" for personal use.</p>
            <p><strong>To bypass it:</strong></p>
            <ol className="list-decimal list-inside pl-2">
                <li>Click the <strong>Advanced</strong> link on the bottom left of that screen.</li>
                <li>Click <strong>Go to Business Manager (unsafe)</strong>.</li>
                <li>Click <strong>Continue</strong> to finish signing in.</li>
            </ol>
            <p className="mt-2"><strong>Can't switch accounts?</strong> We have updated the app to force the "Choose an Account" screen every time you click Sign In.</p>
          </div>
        )
      },
      {
        title: 'Dashboard & Smart Analyst',
        content: (
          <div className="space-y-2">
            <p>The dashboard provides a quick overview of your business metrics like sales, dues, and low stock items.</p>
            <h4 className="font-semibold mt-2">Smart Analyst (AI)</h4>
            <p className="text-sm">The top card uses AI to help you:</p>
            <ul className="list-disc list-inside pl-4 text-sm">
                <li><strong>Revenue Projection:</strong> Predicts end-of-month sales based on current trends.</li>
                <li><strong>Stock Alerts:</strong> Identifies slow-moving "Dead Stock" to help you clear inventory.</li>
                <li><strong>Cash Flow:</strong> Warns if spending exceeds income for the current period.</li>
            </ul>
          </div>
        )
      },
      {
        title: 'Sales & Magic Paste',
        content: (
          <div className="space-y-2 text-sm">
            <p>Create new invoices and manage customer payments.</p>
            <h4 className="font-semibold mt-2">Using Magic Paste (AI):</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>Click the <strong>"Magic Paste Order"</strong> button on the Sales page.</li>
              <li>Paste a text message (e.g., from WhatsApp) containing an order.</li>
              <li>The AI will automatically extract items, quantities, and prices to fill your cart.</li>
            </ol>
            <h4 className="font-semibold mt-2">Recording Payment for Dues:</h4>
            <p>Select a customer without adding items to the cart, enter the amount, and click "Record Standalone Payment".</p>
          </div>
        )
      },
      {
        title: 'Invoice Designer',
        content: (
          <div className="space-y-2 text-sm">
            <p>Customize your invoice layout to match your brand.</p>
            <ul className="list-disc list-inside pl-4">
                <li><strong>Absolute Positioning:</strong> In the Layout tab, use the arrow keys to nudge the Logo or QR code to the exact pixel you want.</li>
                <li><strong>Draft Mode:</strong> Toggle this on to speed up the editor if it feels slow on older devices. It lowers the preview quality temporarily.</li>
                <li><strong>Templates:</strong> Save your designs or load presets like "Modern" or "Receipt" for thermal printers.</li>
            </ul>
          </div>
        )
      },
      {
        title: 'System Optimizer',
        content: (
          <div className="space-y-2 text-sm">
            <p>Located in the menu under "Admin", this tool helps keep your app fast.</p>
            <ul className="list-disc list-inside pl-4">
                <li><strong>Image Optimization:</strong> Compresses large product images to save space without losing visible quality.</li>
                <li><strong>Performance Mode:</strong> Disables blur effects and animations to save battery on mobile devices.</li>
                <li><strong>Database Cleanup:</strong> Removes old logs and notifications to free up storage.</li>
            </ul>
          </div>
        )
      },
      {
        title: 'Customization',
        content: (
          <div className="space-y-2 text-sm">
            <p>Make the app truly yours via the <strong>Customize</strong> menu:</p>
            <ul className="list-disc list-inside pl-4">
                <li><strong>Navigation:</strong> Reorder the bottom bar buttons. Put your most used pages (like Sales or Reports) first.</li>
                <li><strong>Quick Actions:</strong> Choose which shortcuts appear when you press the floating "+" button.</li>
                <li><strong>Themes:</strong> Change the app color scheme or switch between Dark/Light mode in the main menu.</li>
            </ul>
          </div>
        )
      },
      {
        title: 'Data Safety',
        content: (
          <div className="space-y-2 text-sm">
            <p className="font-bold text-red-600">Important: All data is saved ONLY on your device by default.</p>
            <ol className="list-decimal list-inside pl-4">
              <li><strong>Local Backups:</strong> Download a JSON backup file regularly from the Dashboard.</li>
              <li><strong>Cloud Sync:</strong> Sign in with Google to auto-sync your data to your personal Google Drive.</li>
              <li><strong>Checkpoints:</strong> Create a "Checkpoint" before making big changes (like bulk edits) to easily undo them later.</li>
            </ol>
          </div>
        )
      },
    ]
  },
  te: {
    title: 'సహాయం & డాక్యుమెంటేషన్',
    sections: [
      {
        title: 'గూగుల్ సైన్-ఇన్ సమస్యలు',
        content: (
          <div className="space-y-2 text-sm bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800">
            <h4 className="font-bold text-yellow-800 dark:text-yellow-200">"Google hasn\'t verified this app"</h4>
            <p>సైన్ ఇన్ చేస్తున్నప్పుడు హెచ్చరిక స్క్రీన్ కనిపిస్తే, చింతించకండి. ఇది "టెస్టింగ్ మోడ్"లో ఉన్నందున జరుగుతుంది.</p>
            <p><strong>దాన్ని దాటవేయడానికి:</strong></p>
            <ol className="list-decimal list-inside pl-2">
                <li>స్క్రీన్ ఎడమ వైపున ఉన్న <strong>Advanced</strong> లింక్ పై క్లిక్ చేయండి.</li>
                <li><strong>Go to Business Manager (unsafe)</strong> పై క్లిక్ చేయండి.</li>
                <li>సైన్ ఇన్ పూర్తి చేయడానికి <strong>Continue</strong> పై క్లిక్ చేయండి.</li>
            </ol>
          </div>
        )
      },
      {
        title: 'డాష్‌బోర్డ్ & స్మార్ట్ అనలిస్ట్',
        content: (
          <div className="space-y-2">
            <p>డాష్‌బోర్డ్ మీ వ్యాపారం యొక్క అమ్మకాలు మరియు బకాయిల అవలోకనాన్ని ఇస్తుంది.</p>
             <h4 className="font-semibold mt-2">స్మార్ట్ అనలిస్ట్ (AI)</h4>
            <ul className="list-disc list-inside pl-4 text-sm">
                <li><strong>ఆదాయ అంచనా:</strong> ఈ నెలాఖరుకు అమ్మకాలు ఎలా ఉంటాయో అంచనా వేస్తుంది.</li>
                <li><strong>స్టాక్ హెచ్చరికలు:</strong> అమ్ముడుపోని వస్తువులను (Dead Stock) గుర్తిస్తుంది.</li>
            </ul>
          </div>
        )
      },
      {
        title: 'అమ్మకాలు & మ్యాజిక్ పేస్ట్',
        content: (
          <div className="space-y-2 text-sm">
            <p>కొత్త ఇన్‌వాయిస్‌లను సృష్టించండి.</p>
            <h4 className="font-semibold mt-2">మ్యాజిక్ పేస్ట్ (AI) వాడకం:</h4>
            <ol className="list-decimal list-inside pl-4">
              <li>సేల్స్ పేజీలో <strong>"Magic Paste Order"</strong> బటన్ నొక్కండి.</li>
              <li>WhatsApp లేదా SMS నుండి ఆర్డర్ మెసేజ్‌ను పేస్ట్ చేయండి.</li>
              <li>AI ఆటోమేటిక్‌గా వస్తువులను మరియు ధరలను గుర్తిస్తుంది.</li>
            </ol>
          </div>
        )
      },
      {
        title: 'సిస్టమ్ ఆప్టిమైజర్',
        content: (
          <div className="space-y-2 text-sm">
            <p>అడ్మిన్ మెనూలో ఉన్న ఈ టూల్ యాప్‌ను వేగంగా ఉంచుతుంది.</p>
            <ul className="list-disc list-inside pl-4">
                <li><strong>ఇమేజ్ ఆప్టిమైజేషన్:</strong> ఫోటోల సైజును తగ్గించి మెమరీని ఆదా చేస్తుంది.</li>
                <li><strong>పెర్ఫార్మెన్స్ మోడ్:</strong> పాత ఫోన్లలో బ్యాటరీ ఆదా చేయడానికి యానిమేషన్లను తగ్గిస్తుంది.</li>
            </ul>
          </div>
        )
      },
      {
        title: 'డేటా భద్రత',
        content: (
          <div className="space-y-2 text-sm">
            <p className="font-bold text-red-600">ముఖ్యమైనది: డేటా మీ ఫోన్‌లో మాత్రమే సేవ్ అవుతుంది.</p>
            <ol className="list-decimal list-inside pl-4">
              <li><strong>బ్యాకప్:</strong> డాష్‌బోర్డ్ నుండి తరచుగా బ్యాకప్ ఫైల్‌ను డౌన్‌లోడ్ చేసుకోండి.</li>
              <li><strong>క్లౌడ్ సింక్:</strong> Google Driveకు ఆటోమేటిక్ బ్యాకప్ కోసం సైన్ ఇన్ చేయండి.</li>
            </ol>
          </div>
        )
      },
    ]
  }
};

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [language, setLanguage] = useState<'en' | 'te'>('en');

  useEffect(() => {
      if (isOpen) document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const content = helpContent[language];

  return createPortal(
    <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-2xl h-full flex flex-col p-0 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-theme p-4 flex justify-between items-center text-white shrink-0">
            <h2 className="font-bold text-lg flex items-center gap-2">
               {content.title}
            </h2>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setLanguage(prev => prev === 'en' ? 'te' : 'en')}
                    className="text-xs font-bold bg-white/20 hover:bg-white/30 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                >
                    <Globe size={14} />
                    {language === 'en' ? 'తెలుగు' : 'English'}
                </button>
                <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-5 space-y-6">
            {content.sections.map((section, index) => (
                <div key={index} className="border-b border-gray-100 dark:border-slate-700 pb-4 last:border-0">
                    <h3 className="text-lg font-bold text-primary mb-2">{section.title}</h3>
                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {section.content}
                    </div>
                </div>
            ))}
        </div>
      </Card>
    </div>,
    document.body
  );
};

export default HelpModal;