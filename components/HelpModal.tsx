import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, BookOpen, ChevronRight, Search } from 'lucide-react';
import Card from './Card';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpContent = {
  en: {
    title: 'Knowledge Base',
    sections: [
      {
        title: '🚀 Getting Started',
        content: (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Welcome to your Business Manager!</p>
            <p>This application is designed to run completely <strong>offline-first</strong> on your device. Here are the basics:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-slate-600 dark:text-slate-300">
              <li><strong>Navigation:</strong> Use the bottom bar (mobile) or left sidebar (desktop) to switch between pages.</li>
              <li><strong>Offline Mode:</strong> You don't need internet for day-to-day operations. Internet is only needed for Google Backups and AI features.</li>
              <li><strong>PWA:</strong> You can install this app on your phone's home screen for a full app-like experience.</li>
            </ul>
          </div>
        )
      },
      {
        title: '📊 Dashboard & Widgets',
        content: (
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
              <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-1">Smart Analyst (AI)</h4>
              <p>Your personal business assistant. It analyzes your data to show:</p>
              <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                <li><strong>Dead Stock:</strong> Items that haven't sold in 60+ days. Click to view and clear them.</li>
                <li><strong>Churn Risk:</strong> Regular customers who haven't visited lately.</li>
                <li><strong>Daily Briefing:</strong> A quick audio summary of your day.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
                <h4 className="font-bold text-yellow-700 dark:text-yellow-300">Quick Memo</h4>
                <p>A sticky note for your dashboard. Use it for temporary reminders like "Call distributor" or "Order paper rolls". It auto-saves!</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <h4 className="font-bold text-blue-700 dark:text-blue-300">Goal Tracker</h4>
                <p>Set a monthly sales target. The bar fills up as you make sales. Click the pencil icon to edit your goal.</p>
              </div>
            </div>
          </div>
        )
      },
      {
        title: '💰 Sales & Invoicing',
        content: (
          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-slate-800 dark:text-white border-b pb-1">Creating a Sale</h4>
            <ol className="list-decimal list-inside space-y-2 ml-2 text-slate-600 dark:text-slate-300">
              <li>Go to <strong>Sales</strong> page.</li>
              <li>Search for a product or scan a barcode.</li>
              <li>Adjust quantity in the cart.</li>
              <li>Select a Customer (optional, but recommended for tracking dues).</li>
              <li>Click <strong>Checkout</strong>, choose payment method (Cash/Online/Due).</li>
            </ol>

            <h4 className="font-semibold text-slate-800 dark:text-white border-b pb-1 mt-4">Magic Paste (AI) ✨</h4>
            <p>Perfect for WhatsApp orders! Copy a message like <em className="text-slate-500">"Need 2 Colgate paste and 5kg Rice"</em> and click <strong>Magic Paste Order</strong>. The AI will fill your cart automatically.</p>
          </div>
        )
      },
      {
        title: '📦 Inventory Management',
        content: (
          <div className="space-y-3 text-sm">
            <ul className="list-disc list-inside space-y-2 ml-2 text-slate-600 dark:text-slate-300">
              <li><strong>Adding Products:</strong> Go to Products &gt; + Add. You can also generate barcodes here.</li>
              <li><strong>Bulk Edit:</strong> Need to change many prices? Use the "Batch Editor" in the Products menu to update multiple items at once.</li>
              <li><strong>Low Stock:</strong> Items below their "Min Stock" level appear in red on the Dashboard and Reports.</li>
            </ul>
          </div>
        )
      },
      {
        title: '🛡️ Data Safety & backup (CRITICAL)',
        content: (
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
              <h4 className="font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                ⚠️ Your data is on YOUR device only!
              </h4>
              <p className="mt-1">We do not have a central server. If you lose your phone/laptop, you lose your data unless you backup.</p>
            </div>

            <h4 className="font-semibold mt-2">How to Backup:</h4>
            <ol className="list-decimal list-inside ml-2">
              <li><strong>Google Drive Sync:</strong> Sign in with Google (in Settings) for automatic cloud backups.</li>
              <li><strong>Manual Backup:</strong> On Dashboard, click detail menu (top right) &gt; <strong>Download Backup</strong>. Save this file safely (email it to yourself).</li>
              <li><strong>Checkpoints:</strong> Before making big changes, create a "Checkpoint" to save a restore point.</li>
            </ol>
          </div>
        )
      },
      {
        title: '⌨️ Keyboard Shortcuts',
        content: (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span>New Sale</span> <kbd className="font-mono bg-white dark:bg-slate-700 px-1 rounded border border-slate-300 dark:border-slate-600">Shift + S</kbd>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span>New Customer</span> <kbd className="font-mono bg-white dark:bg-slate-700 px-1 rounded border border-slate-300 dark:border-slate-600">Shift + C</kbd>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span>New Purchase</span> <kbd className="font-mono bg-white dark:bg-slate-700 px-1 rounded border border-slate-300 dark:border-slate-600">Shift + P</kbd>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <span>New Estimate</span> <kbd className="font-mono bg-white dark:bg-slate-700 px-1 rounded border border-slate-300 dark:border-slate-600">Shift + Q</kbd>
              </div>
            </div>
          </div>
        )
      }
    ]
  },
  te: {
    title: 'సహాయ కేంద్రం (Help Center)',
    sections: [
      {
        title: '🚀 ప్రారంభించడం',
        content: (
          <div className="space-y-3 text-sm">
            <p>మీ బిజినెస్ మేనేజర్‌కు స్వాగతం! ఈ యాప్ పూర్తిగా మీ ఫోన్‌లోనే పనిచేస్తుంది (Offline-first).</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>నావిగేషన్:</strong> స్క్రీన్ కింద ఉన్న బార్ ఉపయోగించి పేజీలను మార్చండి.</li>
              <li><strong>ఆఫ్‌లైన్ మోడ్:</strong> రోజువారీ పనులకు ఇంటర్నెట్ అవసరం లేదు. కేవలం బ్యాకప్ కోసం మాత్రమే నెట్ కావాలి.</li>
            </ul>
          </div>
        )
      },
      {
        title: '📊 డాష్‌బోర్డ్',
        content: (
          <div className="space-y-3 text-sm">
            <p><strong>స్మార్ట్ అనలిస్ట్ (AI):</strong> మీ వ్యాపారం యొక్క హెల్త్ రిపోర్ట్. స్టాక్ మరియు బకాయిల వివరాలు ఇస్తుంది.</p>
            <p><strong>క్విక్ మెమో:</strong> చిన్న చిన్న నోట్స్ రాసుకోవడానికి (ఉదా: "పాలు ఆర్డర్ చేయాలి").</p>
            <p><strong>గోల్ ట్రాకర్:</strong> ఈ నెల అమ్మకాల లక్ష్యాన్ని సెట్ చేసుకోండి.</p>
          </div>
        )
      },
      {
        title: '💰 అమ్మకాలు (Sales)',
        content: (
          <div className="space-y-3 text-sm">
            <p>సేల్స్ పేజీకి వెళ్లి, వస్తువులను ఎంచుకుని, 'Checkout' నొక్కండి.</p>
            <p><strong>మ్యాజిక్ పేస్ట్:</strong> వాట్సాప్ ఆర్డర్ మెసేజ్‌ను కాపీ చేసి ఇక్కడ పేస్ట్ చేస్తే, ఆటోమేటిక్‌గా బిల్ తయారవుతుంది!</p>
          </div>
        )
      },
      {
        title: '🛡️ డేటా భద్రత (ముఖ్యమైనది)',
        content: (
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
              <h4 className="font-bold text-red-700 dark:text-red-300">⚠️ డేటా మీ బాధ్యత!</h4>
              <p>మా దగ్గర సర్వర్ లేదు. డేటా మీ ఫోన్‌లోనే ఉంటుంది.</p>
            </div>
            <p>దయచేసి తరచుగా <strong>Download Backup</strong> ఆప్షన్ ద్వారా డేటాను సేవ్ చేసుకోండి లేదా Google Driveకు సింక్ చేయండి.</p>
          </div>
        )
      }
    ]
  }
};

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [language, setLanguage] = useState<'en' | 'te'>('en');
  const [activeSection, setActiveSection] = useState<number | null>(0);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const content = helpContent[language];

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-4xl h-[85vh] flex flex-col p-0 animate-scale-in overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-theme p-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="opacity-80" />
            <h2 className="font-bold text-xl">{content.title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(prev => prev === 'en' ? 'te' : 'en')}
              className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors border border-white/10"
            >
              <Globe size={14} />
              {language === 'en' ? 'తెలుగు' : 'English'}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-grow overflow-hidden">
          {/* Sidebar (Desktop) / Top bar (Mobile) could be improved, but using simple list for now */}
          <div className="w-1/3 border-r border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-y-auto hidden md:block">
            <div className="p-2 space-y-1">
              {content.sections.map((section, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSection(index)}
                  className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${activeSection === index
                      ? 'bg-white dark:bg-slate-700 text-primary shadow-sm border border-slate-200 dark:border-slate-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  {section.title}
                  {activeSection === index && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
            {/* Mobile Section Selector */}
            <div className="md:hidden p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-x-auto whitespace-nowrap">
              {content.sections.map((section, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSection(index)}
                  className={`inline-block px-4 py-2 mr-2 rounded-full text-xs font-bold border transition-colors ${activeSection === index
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                    }`}
                >
                  {section.title}
                </button>
              ))}
            </div>

            <div className="p-6 md:p-8 max-w-3xl mx-auto">
              {activeSection !== null && content.sections[activeSection] ? (
                <div className="animate-fade-in-right">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 pb-2 border-b border-slate-100 dark:border-slate-700">
                    {content.sections[activeSection].title}
                  </h2>
                  <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                    {content.sections[activeSection].content}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Search size={48} className="mb-4 opacity-50" />
                  <p>Select a topic to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
};

export default HelpModal;