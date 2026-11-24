import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  ShoppingCart,
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/stores';
import { logout } from '@/services/auth';
import { AUTH_EXPIRED_EVENT } from '@/services/api-client';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, markNotificationRead, currentUser } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStaffSelect, setShowStaffSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getPageTitle = (path: string): { title: string; subtitle: string } => {
    if (path === '/') return { title: 'Operational Dashboard', subtitle: 'Store performance overview & daily metrics' };
    if (path.startsWith('/pos')) return { title: 'POS Billing Terminal', subtitle: 'Barcode scan, quick cart & instant checkout' };
    if (path.startsWith('/invoices')) return { title: 'Invoice History', subtitle: 'Audit, reprint and manage past sales' };
    if (path.startsWith('/returns')) return { title: 'Returns & Exchanges', subtitle: 'Process return requests & replacement orders' };
    if (path.startsWith('/credit-notes')) return { title: 'Credit Notes', subtitle: 'Store credit and adjustment vouchers' };
    if (path.startsWith('/catalogue/add')) return { title: 'Add Jewellery Item', subtitle: 'Item registration, metal specs & barcode' };
    if (path.startsWith('/catalogue')) return { title: 'Jewellery Catalogue', subtitle: 'Manage stock pieces, pricing & status' };
    if (path.startsWith('/barcode')) return { title: 'Barcode Generator', subtitle: 'Create Code 128 barcodes & tags' };
    if (path.startsWith('/labels')) return { title: 'Label Printing', subtitle: 'Thermal & jewellery tag printing' };
    if (path.startsWith('/scan')) return { title: 'Scan & Search', subtitle: 'Instant barcode lookup & item details' };
    if (path.startsWith('/customers')) return { title: 'Customer Management', subtitle: 'CRM, loyalty points & purchase history' };
    if (path.startsWith('/loyalty')) return { title: 'Loyalty & Rewards', subtitle: 'Reward points, tiers & redemption history' };
    if (path.startsWith('/ledger')) return { title: 'Customer Ledger', subtitle: 'Debit/credit balance & payment records' };
    if (path.startsWith('/payments')) return { title: 'Payment Records', subtitle: 'All transaction records across modes' };
    if (path.startsWith('/daily-closing')) return { title: 'Daily Register Closing', subtitle: 'Cash drawer tally & shift balance' };
    if (path.startsWith('/old-gold')) return { title: 'Old Gold Exchange', subtitle: 'Valuation, testing deductions & exchange bills' };
    if (path.startsWith('/repairs')) return { title: 'Repair Orders', subtitle: 'Service tracking & job card management' };
    if (path.startsWith('/reports')) return { title: 'Sales Reports & Analytics', subtitle: 'Revenue breakdowns, category & metal analysis' };
    if (path.startsWith('/rates')) return { title: 'Gold Rate Management', subtitle: 'Daily benchmark rates per gram' };
    return { title: 'JewelSync', subtitle: 'Smart Billing. Seamless Retail.' };
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/scan?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#E5DDD0] bg-white/95 px-6 backdrop-blur-xs shadow-2xs">
      {/* Title & Breadcrumb */}
      <div>
        <h2 className="font-serif text-base font-semibold text-[#2D2A26] tracking-tight">{title}</h2>
        <p className="text-[11px] text-[#8A8278] hidden sm:block">{subtitle}</p>
      </div>

      {/* Global Quick Search */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative max-w-xs w-full mx-4">
        <Search className="absolute left-3 h-4 w-4 text-[#8A8278] pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Scan barcode or search item... (Enter)"
          className="w-full h-8 pl-9 pr-3 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-md focus:outline-none focus:border-[#C9A96E] focus:bg-white text-[#2D2A26] placeholder:text-[#8A8278] transition-all"
        />
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live Date & Time */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-[#FAF7F2] border border-[#E5DDD0] rounded-md text-xs text-[#3D3A36]">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#C9A96E]" />
            <span>
              {currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <span className="text-[#E5DDD0]">|</span>
          <div className="flex items-center gap-1.5 font-mono">
            <Clock className="h-3.5 w-3.5 text-[#C9A96E]" />
            <span>{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>

        {/* Notifications dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative h-8 w-8 rounded-md border border-[#E5DDD0] bg-white text-[#3D3A36] hover:bg-[#FAF7F2] flex items-center justify-center transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#C53030] text-[9px] font-bold text-white flex items-center justify-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#E5DDD0] bg-white p-3 shadow-xl z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-[#F5F0E8] mb-2">
                <span className="font-serif text-xs font-semibold text-[#2D2A26]">Store Alerts</span>
                <span className="text-[10px] text-[#8A8278]">{unreadCount} unread</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#8A8278] text-center py-4">No notifications</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.link) {
                          navigate(n.link);
                          setShowNotifications(false);
                        }
                      }}
                      className={`p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        n.read ? 'bg-[#FAF7F2]/60 opacity-70' : 'bg-[#F5F0E8] font-medium'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
                        {n.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
                        {n.type === 'info' && <Info className="h-4 w-4 text-[#C9A96E] shrink-0 mt-0.5" />}
                        <div className="flex-1">
                          <p className="font-semibold text-[#2D2A26]">{n.title}</p>
                          <p className="text-[11px] text-[#8A8278]">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Account menu */}
        <div className="relative">
          <button
            onClick={() => setShowStaffSelect(!showStaffSelect)}
            className="flex items-center gap-2 h-8 px-2.5 rounded-md border border-[#E5DDD0] bg-white hover:bg-[#FAF7F2] text-xs transition-colors"
          >
            <div className="h-5 w-5 rounded-full bg-[#C9A96E] text-white flex items-center justify-center font-bold text-[10px]">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <span className="hidden sm:inline font-medium text-[#2D2A26]">{currentUser?.name}</span>
            <ChevronDown className="h-3 w-3 text-[#8A8278]" />
          </button>

          {showStaffSelect && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[#E5DDD0] bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1.5 border-b border-[#F5F0E8] mb-1">
                <p className="text-xs font-semibold text-[#2D2A26] truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-[#8A8278] truncate">{currentUser?.role}{currentUser?.email ? ` • ${currentUser.email}` : ''}</p>
              </div>
              <button
                onClick={() => {
                  setShowStaffSelect(false);
                  logout();
                  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
                }}
                className="w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center gap-2 text-[#C53030] hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Button: New POS Bill */}
        {location.pathname !== '/pos' && (
          <Button
            size="sm"
            onClick={() => navigate('/pos')}
            className="flex items-center gap-1.5 shadow-xs"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Bill</span>
          </Button>
        )}
      </div>
    </header>
  );
}
