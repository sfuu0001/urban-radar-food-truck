import React, { useState } from 'react';
import { 
  UserCheck, 
  Shield, 
  Key, 
  Clock, 
  DollarSign, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  Briefcase, 
  Award,
  Sparkles,
  Sliders,
  ChevronRight,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { StaffMember, StaffRole } from '../../types';
import { INITIAL_STAFF_MEMBERS } from '../../data/merchantExtendedMockData';
import { playChimeSound } from '../../utils/voiceAlertEngine';
import { getSecurityAuditLogs, SecurityAuditEvent } from '../../utils/rbacEngine';

interface MerchantStaffHubProps {
  showToast: (msg: string) => void;
}

export const MerchantStaffHub: React.FC<MerchantStaffHubProps> = ({ showToast }) => {
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    const raw = localStorage.getItem('obsidian_staff_members');
    return raw ? JSON.parse(raw) : INITIAL_STAFF_MEMBERS;
  });

  const [activeTab, setActiveTab] = useState<'roster' | 'rbac' | 'clockin' | 'audit'>('roster');
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEvent[]>(() => getSecurityAuditLogs());
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(staffList[0] || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New staff state
  const [newName, setNewName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newRole, setNewRole] = useState<StaffRole>('cashier');

  const saveStaffList = (updated: StaffMember[]) => {
    setStaffList(updated);
    localStorage.setItem('obsidian_staff_members', JSON.stringify(updated));
  };

  const handleToggleClockIn = (staffId: string) => {
    const updated = staffList.map(s => {
      if (s.id === staffId) {
        const nextStatus = s.status === 'active' ? 'off_duty' : 'active';
        return {
          ...s,
          status: nextStatus as any,
          shiftStart: nextStatus === 'active' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          workHoursToday: nextStatus === 'active' ? s.workHoursToday : s.workHoursToday + 0.5
        };
      }
      return s;
    });

    saveStaffList(updated);
    playChimeSound('order');
    showToast('员工打卡考勤状态已实时更新！');
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const roleTitles: Record<StaffRole, string> = {
      manager: '店长 / 运营主管',
      cashier: '前台收银员 / 领班',
      grill_chef: '炭烤档口主厨',
      barista: '特调水吧师',
      rider: '专送配送骑手'
    };

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      staffNo: `ST-00${staffList.length + 1}`,
      name: newName,
      phone: newPhone,
      role: newRole,
      roleTitle: roleTitles[newRole],
      permissions: newRole === 'manager' ? ['all'] : ['pos_order', 'table_manage'],
      status: 'active',
      shiftStart: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      workHoursToday: 0,
      monthlySales: 0,
      monthlyCommission: 0,
      joinedDate: new Date().toISOString().slice(0, 10)
    };

    saveStaffList([...staffList, newStaff]);
    setIsAddModalOpen(false);
    setNewName('');
    setNewPhone('');
    playChimeSound('success');
    showToast(`员工【${newName}】已录入花名册并分配初始权限！`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-lg border border-[#e3e2e0] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <UserCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-[#37352f]">员工花名册与岗位权限矩阵 (RBAC)</h2>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded shrink-0">
              在职员工 {staffList.length} 人 ({staffList.filter(s => s.status === 'active').length} 人在岗)
            </span>
          </div>
          <p className="text-xs text-[#787774] mt-1">
            支持店长/收银员/烤师/调饮师/骑手多角色权限隔离，上下班打卡工时统计与月度业绩提成。
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>录入新员工</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">当前在岗考勤</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-700">
              {staffList.filter(s => s.status === 'active').length}
            </span>
            <span className="text-xs text-[#787774]">/ {staffList.length} 人在班</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">今日累计出勤工时</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-[#37352f]">
              {staffList.reduce((sum, s) => sum + s.workHoursToday, 0).toFixed(1)}
            </span>
            <span className="text-xs text-[#787774]">工时</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">本月全店提成激励</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xs text-amber-700 font-bold">¥</span>
            <span className="text-2xl font-bold text-amber-700">
              {staffList.reduce((sum, s) => sum + s.monthlyCommission, 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">权限安全级别</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-[#37352f]">高</span>
            <span className="text-xs text-emerald-600 font-medium">角色分级已开启</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-white rounded-lg border border-[#e3e2e0] p-3.5 sm:p-4 space-y-4">
        <div className="flex items-center gap-1 pb-3 border-b border-[#e3e2e0] overflow-x-auto no-scrollbar flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'roster' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
            }`}
          >
            <span className="hidden sm:inline">员工档案与考勤 ({staffList.length})</span>
            <span className="sm:hidden">员工考勤 ({staffList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rbac')}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'rbac' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
            }`}
          >
            <span className="hidden sm:inline">岗位角色权限矩阵 (RBAC)</span>
            <span className="sm:hidden">权限矩阵</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuditLogs(getSecurityAuditLogs());
              setActiveTab('audit');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">安全审计与越权追溯 ({auditLogs.length})</span>
            <span className="sm:hidden">安全审计 ({auditLogs.length})</span>
          </button>
        </div>

        {/* 1. Staff Roster Table & Responsive Cards */}
        {activeTab === 'roster' && (
          <div>
            {/* Mobile / Tablet Cards (< md) */}
            <div className="md:hidden space-y-2.5">
              {staffList.map(staff => (
                <div
                  key={staff.id}
                  className="p-3 bg-white border border-[#e3e2e0] rounded-lg space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#37352f]">{staff.name}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                          staff.role === 'manager'
                            ? 'bg-purple-50 text-purple-900 border-purple-200'
                            : staff.role === 'cashier'
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : staff.role === 'grill_chef'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : staff.role === 'barista'
                            ? 'bg-cyan-50 text-cyan-900 border-cyan-200'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}>
                          {staff.roleTitle}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#787774] mt-0.5">
                        工号: {staff.staffNo} · 手机: {staff.phone}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleClockIn(staff.id)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer border transition-colors shrink-0 ${
                        staff.status === 'active'
                          ? 'bg-[#f7f7f5] hover:bg-[#e3e2e0] text-[#787774] border-[#d3d1cb]'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {staff.status === 'active' ? '签退下班' : '打卡上班'}
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#fafaf8] rounded border border-neutral-100 text-center">
                    <div>
                      <div className="text-[10px] text-[#787774]">考勤状态</div>
                      <div className="text-xs font-bold text-neutral-800 mt-0.5">
                        {staff.status === 'active' ? '在岗' : '已打烊'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#787774]">今日工时</div>
                      <div className="font-mono text-xs text-[#37352f] font-semibold mt-0.5">
                        {staff.workHoursToday}h
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#787774]">本月业绩</div>
                      <div className="font-mono text-xs text-[#787774] mt-0.5">
                        {staff.monthlySales > 0 ? `¥${(staff.monthlySales / 1000).toFixed(1)}k` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#787774]">本月提成</div>
                      <div className="font-mono text-xs font-bold text-amber-700 mt-0.5">
                        ¥{staff.monthlyCommission}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
              <table className="w-full text-xs text-left min-w-[640px]">
                <thead className="bg-[#f7f7f5] text-[#787774] font-medium border-y border-[#e3e2e0]">
                  <tr>
                    <th className="py-2.5 px-3">工号 / 姓名</th>
                    <th className="py-2.5 px-3">岗位角色</th>
                    <th className="py-2.5 px-3">联系电话</th>
                    <th className="py-2.5 px-3">考勤状态</th>
                    <th className="py-2.5 px-3">今日工时</th>
                    <th className="py-2.5 px-3 text-right">本月业绩</th>
                    <th className="py-2.5 px-3 text-right">本月提成</th>
                    <th className="py-2.5 px-3 text-right">考勤操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1ef]">
                  {staffList.map(staff => (
                    <tr key={staff.id} className="hover:bg-[#fbfbfa]">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#37352f]">{staff.name}</div>
                        <span className="text-[11px] font-mono text-[#787774]">{staff.staffNo}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          staff.role === 'manager'
                            ? 'bg-purple-50 text-purple-900 border-purple-200'
                            : staff.role === 'cashier'
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : staff.role === 'grill_chef'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : staff.role === 'barista'
                            ? 'bg-cyan-50 text-cyan-900 border-cyan-200'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}>
                          {staff.roleTitle}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#37352f]">{staff.phone}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1 ${
                          staff.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${staff.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`}></span>
                          {staff.status === 'active' ? `在岗 (${staff.shiftStart} 上班)` : '已打烊/休假'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#37352f]">{staff.workHoursToday} 小时</td>
                      <td className="py-3 px-3 text-right font-mono text-[#37352f]">
                        {staff.monthlySales > 0 ? `¥${staff.monthlySales.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-700 font-mono">
                        ¥{staff.monthlyCommission.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleClockIn(staff.id)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer border transition-colors ${
                            staff.status === 'active'
                              ? 'bg-[#f7f7f5] hover:bg-[#e3e2e0] text-[#787774] border-[#d3d1cb]'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {staff.status === 'active' ? '签退下班' : '打卡上班'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. RBAC Permission Matrix */}
        {activeTab === 'rbac' && (
          <div className="space-y-4">
            <p className="text-xs text-[#787774]">
              精细化权限矩阵：不同角色仅可访问授权范围内的功能模块，敏感财务数据（如毛利成本、折扣审批、退款审核）仅店长可支配。
            </p>

            {/* Mobile / Tablet Accordion Card View (< md) */}
            <div className="md:hidden space-y-2">
              {[
                { name: '堂食台位开台 / 加菜点单', mgr: true, pos: true, grill: false, bar: false, rider: false },
                { name: '收银结账 / 储值扣减 / 小票打印', mgr: true, pos: true, grill: false, bar: false, rider: false },
                { name: 'KDS 后厨出品看板与划单', mgr: true, pos: false, grill: true, bar: true, rider: false },
                { name: '菜品价格与外卖折扣调整', mgr: true, pos: false, grill: false, bar: false, rider: false },
                { name: '整单退款与非退款风控审批', mgr: true, pos: false, grill: false, bar: false, rider: false },
                { name: '配方标准 SOP 与物料初加工', mgr: true, pos: false, grill: true, bar: true, rider: false },
                { name: '每日打烊盘点与损耗登记', mgr: true, pos: true, grill: true, bar: false, rider: false },
                { name: '查看经营净利润与数据报表导出', mgr: true, pos: false, grill: false, bar: false, rider: false },
                { name: '专送骑手接单与配送轨迹同步', mgr: true, pos: false, grill: false, bar: false, rider: true }
              ].map((row, idx) => (
                <div key={idx} className="p-3 bg-white border border-[#e3e2e0] rounded-lg space-y-2 shadow-2xs">
                  <div className="font-bold text-xs text-[#37352f]">{row.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded border font-medium ${row.mgr ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral-50 text-neutral-400 border-neutral-200 line-through'}`}>
                      店长
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border font-medium ${row.pos ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral-50 text-neutral-400 border-neutral-200 line-through'}`}>
                      前台收银
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border font-medium ${row.grill ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral-50 text-neutral-400 border-neutral-200 line-through'}`}>
                      炭烤主厨
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border font-medium ${row.bar ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral-50 text-neutral-400 border-neutral-200 line-through'}`}>
                      水吧
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border font-medium ${row.rider ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral-50 text-neutral-400 border-neutral-200 line-through'}`}>
                      专送骑手
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto border border-[#e3e2e0] rounded-lg -mx-3.5 sm:mx-0">
              <table className="w-full text-xs text-left min-w-[580px]">
                <thead className="bg-[#f7f7f5] text-[#37352f] font-bold border-b border-[#e3e2e0]">
                  <tr>
                    <th className="py-3 px-3 sticky left-0 bg-[#f7f7f5] z-10">功能模块 / 权限项目</th>
                    <th className="py-3 px-3 text-center">店长 / 运营主管</th>
                    <th className="py-3 px-3 text-center">前台领班 / 收银</th>
                    <th className="py-3 px-3 text-center">后厨炭烤主厨</th>
                    <th className="py-3 px-3 text-center">水吧调饮师</th>
                    <th className="py-3 px-3 text-center">专送配送员</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1ef]">
                  {[
                    { name: '堂食台位开台 / 加菜点单', mgr: true, pos: true, grill: false, bar: false, rider: false },
                    { name: '收银结账 / 储值扣减 / 小票打印', mgr: true, pos: true, grill: false, bar: false, rider: false },
                    { name: 'KDS 后厨出品看板与划单', mgr: true, pos: false, grill: true, bar: true, rider: false },
                    { name: '菜品价格与外卖折扣调整', mgr: true, pos: false, grill: false, bar: false, rider: false },
                    { name: '整单退款与非退款风控审批', mgr: true, pos: false, grill: false, bar: false, rider: false },
                    { name: '配方标准 SOP 与物料初加工', mgr: true, pos: false, grill: true, bar: true, rider: false },
                    { name: '每日打烊盘点与损耗登记', mgr: true, pos: true, grill: true, bar: false, rider: false },
                    { name: '查看经营净利润与数据报表导出', mgr: true, pos: false, grill: false, bar: false, rider: false },
                    { name: '专送骑手接单与配送轨迹同步', mgr: true, pos: false, grill: false, bar: false, rider: true }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#fbfbfa]">
                      <td className="py-2.5 px-3 font-medium text-[#37352f] sticky left-0 bg-white z-10 border-r border-[#f1f1ef]">{row.name}</td>
                      <td className="py-2.5 px-3 text-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.pos ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-neutral-300 inline" />}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.grill ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-neutral-300 inline" />}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.bar ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-neutral-300 inline" />}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.rider ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-neutral-300 inline" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Security Audit & Permission Log Trace */}
        {activeTab === 'audit' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-[#787774]">
                记录餐车全生命周期关键安全事件：越权拦截、店长临时授权、岗位交接班及平台准入。
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuditLogs(getSecurityAuditLogs());
                  showToast('安全审计日志已刷新');
                }}
                className="px-2.5 py-1 text-xs rounded border border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#37352f] font-medium flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>刷新日志</span>
              </button>
            </div>

            <div className="border border-[#e3e2e0] rounded-lg overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[620px]">
                <thead className="bg-[#f7f7f5] text-[#37352f] font-bold border-b border-[#e3e2e0]">
                  <tr>
                    <th className="py-2.5 px-3">时间</th>
                    <th className="py-2.5 px-3">事件类型</th>
                    <th className="py-2.5 px-3">操作人 / 身份</th>
                    <th className="py-2.5 px-3">受控目标</th>
                    <th className="py-2.5 px-3 text-center">状态</th>
                    <th className="py-2.5 px-3">详细审计信息</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1ef]">
                  {auditLogs.map((log) => {
                    const isDenied = log.status === 'denied';
                    const isGranted = log.status === 'granted';
                    const isAllowed = log.status === 'allowed';

                    return (
                      <tr key={log.id} className="hover:bg-[#fbfbfa]">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#787774] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                          {log.action === 'tab_access_denied' && (
                            <span className="text-red-700 font-bold">越权拦截阻断</span>
                          )}
                          {log.action === 'manager_override_granted' && (
                            <span className="text-amber-700 font-bold">店长紧急放行</span>
                          )}
                          {log.action === 'manager_override_failed' && (
                            <span className="text-red-600 font-bold">提权密码错误</span>
                          )}
                          {log.action === 'platform_access_granted' && (
                            <span className="text-indigo-700 font-bold">平台门禁准入</span>
                          )}
                          {log.action === 'platform_access_denied' && (
                            <span className="text-red-600 font-bold">平台门禁拦截</span>
                          )}
                          {log.action === 'auth_login' && (
                            <span className="text-emerald-700 font-bold">员工实名登入</span>
                          )}
                          {log.action === 'auth_logout' && (
                            <span className="text-neutral-500 font-medium">安全注销退出</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#37352f] whitespace-nowrap">
                          {log.operator}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#787774]">
                          {log.target}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isDenied && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              阻断
                            </span>
                          )}
                          {isGranted && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              授权
                            </span>
                          )}
                          {isAllowed && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              通过
                            </span>
                          )}
                          {log.status === 'revoked' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600">
                              注销
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-[#5a5854]">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-[#d3d1cb] shadow-2xl w-full max-w-md p-4 sm:p-5 text-[#37352f] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0] mb-4">
              <h3 className="font-bold text-base">录入新员工入职</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#787774] hover:text-[#37352f] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">员工姓名</label>
                <input
                  type="text"
                  placeholder="如: 赵小刚"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">联系电话</label>
                <input
                  type="tel"
                  placeholder="如: 13800138008"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">入职岗位角色</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as StaffRole)}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded bg-white text-[#37352f]"
                >
                  <option value="cashier">前台收银员 / 领班</option>
                  <option value="grill_chef">炭烤档口主厨</option>
                  <option value="barista">特调水吧师</option>
                  <option value="rider">专送配送员</option>
                  <option value="manager">店长 / 运营主管</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#e3e2e0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-[#787774] hover:text-[#37352f] rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold cursor-pointer shadow-xs"
                >
                  保存入册并开通权限
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
