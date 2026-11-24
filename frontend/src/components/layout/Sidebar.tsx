import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  RotateCcw,
  Gem,
  Barcode,
  Coins,
  Users,
  BookOpen,
  Lock,
  BarChart3,
  TrendingUp,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings,
  LogOut,
  Sliders,
} from 'lucide-react';
import { useAppStore } from '@/stores';
import { cn } from '@/lib/utils';
import { getStoreInfo } from '@/services/data-service';
import { logout } from '@/services/auth';
import { AUTH_EXPIRED_EVENT } from '@/services/api-client';

export function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, currentUser } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(
    ['/returns', '/old-gold', '/ledger', '/daily-closing', '/reports'].some(path =>
      location.pathname.startsWith(path)
    )
  );
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const storeInfo = getStoreInfo();

  const handleSignOut = () => {
    logout();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  };

  // 6 Primary Navigation Items
  const primaryNavItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'New Bill', href: '/pos', icon: ShoppingCart, highlight: true },
    { name: 'Jewellery / Products', href: '/catalogue', icon: Gem },
    { name: 'Barcode & Labels', href: '/barcode', icon: Barcode },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Transactions', href: '/invoices', icon: Receipt },
  ];

  // Secondary Items placed under "More Operations"
  const canManage = currentUser?.role !== 'Cashier'; // server enforces this too; this just avoids dead-end screens
  const moreNavItems = [
    { name: 'Returns & Exchanges', href: '/returns', icon: RotateCcw },
    { name: 'Old Gold Exchange', href: '/old-gold', icon: Coins },
    { name: 'Customer Ledger', href: '/ledger', icon: BookOpen },
    ...(canManage ? [{ name: 'Daily Closing', href: '/daily-closing', icon: Lock }] : []),
    { name: 'Sales Reports', href: '/reports', icon: BarChart3 },
  ];

  const isMoreActive = moreNavItems.some(item => location.pathname.startsWith(item.href));

  return (
    <>
      <aside
        className={cn(
          'relative flex flex-col border-r border-[#E5DDD0] bg-[#FAF7F2] transition-all duration-300 z-30 select-none h-screen sticky top-0 shadow-2xs',
          sidebarCollapsed ? 'w-18' : 'w-64'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#E5DDD0] bg-[#F5F0E8]/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 rounded-lg bg-[#C9A96E] flex items-center justify-center text-white shrink-0 shadow-xs ring-2 ring-[#C9A96E]/20">
              <Sparkles className="h-5 w-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <h1 className="font-serif font-bold text-sm tracking-wide text-[#2D2A26] truncate">
                  JEWELSYNC
                </h1>
                <p className="text-[10px] tracking-tight text-[#8A8278] truncate font-medium">
                  Smart Billing. Seamless Retail.
                </p>
              </div>
            )}
          </div>

          {/* Toggle Collapse */}
          <button
            onClick={toggleSidebar}
            className="h-7 w-7 rounded-md border border-[#E5DDD0] bg-white text-[#8A8278] hover:text-[#2D2A26] flex items-center justify-center hover:bg-[#FAF7F2] transition-colors"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
          {!sidebarCollapsed && (
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8A8278]/70 mb-2">
              Main Menu
            </div>
          )}

          {/* Primary 6 Items */}
          {primaryNavItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative',
                    isActive
                      ? 'bg-[#C9A96E] text-white shadow-xs font-semibold'
                      : item.highlight
                      ? 'text-[#8F6F2C] bg-[#C9A96E]/10 hover:bg-[#C9A96E]/20'
                      : 'text-[#3D3A36] hover:bg-[#F5F0E8] hover:text-[#2D2A26]'
                  )
                }
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-105', item.highlight ? 'text-[#C9A96E] group-hover:text-inherit' : '')} />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                {item.highlight && !sidebarCollapsed && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider bg-[#C9A96E] text-white px-1.5 py-0.5 rounded font-bold">
                    Fast
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* "More" Section with Collapsible Menu */}
          <div className="pt-2">
            {!sidebarCollapsed ? (
              <div className="rounded-lg border border-[#E5DDD0]/60 bg-white/40 overflow-hidden">
                <button
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors',
                    isMoreActive
                      ? 'text-[#C9A96E] font-semibold bg-[#FAF7F2]'
                      : 'text-[#5C564E] hover:bg-[#F5F0E8] hover:text-[#2D2A26]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Sliders className="h-4 w-4 text-[#8A8278]" />
                    <span>More Operations</span>
                  </div>
                  {moreOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-[#8A8278]" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-[#8A8278]" />
                  )}
                </button>

                {moreOpen && (
                  <div className="p-1 space-y-0.5 border-t border-[#E5DDD0]/50 bg-[#FAF7F2]/50">
                    {moreNavItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all group',
                              isActive
                                ? 'bg-[#2D2A26] text-white shadow-xs font-semibold'
                                : 'text-[#5C564E] hover:bg-white hover:text-[#2D2A26]'
                            )
                          }
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-[#8A8278] group-hover:text-[#2D2A26]" />
                          <span className="truncate">{item.name}</span>
                        </NavLink>
                      );
                    })}

                    {/* Settings Trigger */}
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#5C564E] hover:bg-white hover:text-[#2D2A26] transition-all text-left"
                    >
                      <Settings className="h-3.5 w-3.5 shrink-0 text-[#8A8278]" />
                      <span className="truncate">Settings & GST Info</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* When collapsed: show More as icon button */
              <div className="space-y-1">
                <button
                  onClick={() => toggleSidebar()}
                  className={cn(
                    'w-full flex items-center justify-center p-2 rounded-lg text-xs transition-colors',
                    isMoreActive ? 'bg-[#2D2A26] text-white' : 'text-[#8A8278] hover:bg-[#F5F0E8] hover:text-[#2D2A26]'
                  )}
                  title="More Modules"
                >
                  <Sliders className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Profile & Actions */}
        <div className="p-3 border-t border-[#E5DDD0] bg-[#F5F0E8]/40 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-white border border-[#E5DDD0]">
            <div className="h-7 w-7 rounded-full bg-[#C9A96E]/20 text-[#8F6F2C] flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.name?.charAt(0) || 'C'}
            </div>
            {!sidebarCollapsed && (
              <div className="truncate flex-1">
                <p className="text-xs font-semibold text-[#2D2A26] truncate">{currentUser?.name || 'Cashier'}</p>
                <p className="text-[10px] text-[#8A8278] truncate">{currentUser?.role || 'Staff'} • Counter 1</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-1 pt-1">
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-[#8A8278] hover:text-[#C53030] py-1 px-2 rounded hover:bg-white transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!sidebarCollapsed && <span>Sign out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Settings & GST Information Dialog */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-[#E5DDD0] shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#C9A96E]" />
                <h3 className="font-serif font-bold text-base text-[#2D2A26]">Store Settings & GST Profile</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-[#8A8278] hover:text-[#2D2A26] text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-[#8A8278]">Store Legal Name:</span>
                  <span className="font-serif font-semibold text-[#2D2A26]">{storeInfo.name} Pvt. Ltd.</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-[#8A8278]">Trade Name:</span>
                  <span className="text-[#2D2A26] font-semibold">{storeInfo.name}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-[#8A8278]">Store GSTIN:</span>
                  <span className="font-mono text-[#2D2A26] font-bold text-[#8F6F2C]">{storeInfo.gstin}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-[#8A8278]">Registered State & Code:</span>
                  <span className="text-[#2D2A26]">{storeInfo.state} (State Code 33)</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-[#8A8278]">Retail GST Rate:</span>
                  <span className="text-[#2D2A26] font-bold">3% (Composite Supply under HSN 7113)</span>
                </div>
              </div>

              <div className="space-y-1 text-[#8A8278]">
                <p>• <strong>Intra-State Supply (Tamil Nadu):</strong> CGST 1.5% + SGST 1.5%</p>
                <p>• <strong>Inter-State Supply (Outside Tamil Nadu):</strong> IGST 3.0%</p>
                <p>• <strong>Making Charges:</strong> Included in taxable composite value at 3% (retail supply)</p>
                <p>• <strong>Standard Barcode:</strong> Code 128 symbology for tags and boxes</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E5DDD0]">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-[#2D2A26] text-white rounded-lg text-xs font-semibold hover:bg-[#3D3A36]"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
