import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[rgb(var(--surface-2))] border-t-2 border-[rgb(var(--border-1))] mt-24" data-testid="footer">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Enhanced Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 p-2 rounded-lg bg-gradient-to-br from-[rgb(var(--brand-blue-50))] to-[rgb(var(--brand-emerald-50))]">
              <div className="grid grid-cols-2 gap-[3px]">
                <div className="w-2 h-2 bg-[rgb(var(--brand-blue-700))] rounded-sm shadow-sm"></div>
                <div className="w-2 h-2 bg-[rgb(var(--brand-emerald-600))] rounded-sm shadow-sm"></div>
                <div className="w-2 h-2 bg-[rgb(var(--brand-emerald-600))] rounded-sm shadow-sm"></div>
                <div className="w-2 h-2 bg-[rgb(var(--brand-blue-700))] rounded-sm shadow-sm"></div>
              </div>
            </div>
            <span className="text-lg font-bold text-[rgb(var(--text-strong))]">
              Про<span className="logo-dot"></span>Маркируй
            </span>
          </div>

          {/* Copyright */}
          <div className="text-sm font-medium text-[rgb(var(--text-muted))]">
            © 2025 Про.Маркируй. Все права защищены.
          </div>

          {/* Contact */}
          <div className="text-sm">
            <a 
              href="mailto:info@promarkirui.ru" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[rgb(var(--border-1))] text-[rgb(var(--brand-blue-700))] font-semibold hover:bg-[rgb(var(--brand-blue-50))] hover:border-[rgb(var(--brand-blue-300))] transition-all shadow-sm hover:shadow-md"
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
