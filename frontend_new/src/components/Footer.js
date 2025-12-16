import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[rgb(var(--grey-100))] border-t-2 border-[rgb(var(--grey-300))] mt-24" data-testid="footer">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Enhanced Logo - Yellow Theme */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-2.5 rounded-xl bg-gradient-to-br from-[rgb(var(--brand-yellow-100))] to-[rgb(var(--brand-yellow-200))] shadow-md">
              <div className="grid grid-cols-2 gap-1">
                <div className="w-2.5 h-2.5 bg-[rgb(var(--brand-yellow-600))] rounded shadow-sm"></div>
                <div className="w-2.5 h-2.5 bg-[rgb(var(--grey-900))] rounded shadow-sm"></div>
                <div className="w-2.5 h-2.5 bg-[rgb(var(--grey-900))] rounded shadow-sm"></div>
                <div className="w-2.5 h-2.5 bg-[rgb(var(--brand-yellow-600))] rounded shadow-sm"></div>
              </div>
            </div>
            <span className="text-lg font-bold text-[rgb(var(--black))]">
              Про<span className="logo-dot"></span>Маркируй
            </span>
          </div>

          {/* Copyright */}
          <div className="text-sm font-semibold text-[rgb(var(--grey-600))]">
            © 2025 Про.Маркируй. Все права защищены.
          </div>

          {/* Contact - Yellow Button */}
          <div className="text-sm">
            <a 
              href="mailto:info@promarkirui.ru" 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[rgb(var(--brand-yellow-500))] to-[rgb(var(--brand-yellow-600))] text-[rgb(var(--black))] font-bold hover:shadow-lg transition-all shadow-md"
            >
              📧 info@promarkirui.ru
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
