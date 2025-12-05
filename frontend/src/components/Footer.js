import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-gray-200 mt-20" data-testid="footer">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="grid grid-cols-2 gap-[2px]">
                <div className="w-1.5 h-1.5 bg-primary rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-accent rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-accent rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-sm"></div>
              </div>
            </div>
            <span className="text-lg font-semibold text-primary">
              Про<span className="logo-dot"></span>Маркируй
            </span>
          </div>

          {/* Copyright */}
          <div className="text-sm text-gray-600">
            © 2025 Про.Маркируй. Все права защищены.
          </div>

          {/* Contact */}
          <div className="text-sm text-gray-600">
            <a href="mailto:info@promarkirui.ru" className="hover:text-primary transition-colors">
              info@promarkirui.ru
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
