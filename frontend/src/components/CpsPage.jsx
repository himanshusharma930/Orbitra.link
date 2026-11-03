import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    RefreshCw, Shield, Server, Play, Plus, Trash2, Edit2, CheckCircle2,
    XCircle, Clock, Globe, ArrowRight, ExternalLink, Terminal, Activity,
    Sliders, ListFilter
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const API_URL = 'api.php';

const CpsPage = () => {
    const { t } = useLanguage();
    const [subTab, setSubTab] = useState('campaigns'); // 'campaigns' | 'proxies' | 'status' | 'logs'
    const [campaigns, setCampaigns] = useState([]);
    const [proxies, setProxies] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal state for Add/Edit Campaign
    const [campaignModalOpen, setCampaignModalOpen] = useState(false);
    const [editingCampaignName, setEditingCampaignName] = useState(null);
    const [campaignForm, setCampaignForm] = useState({
        name: '',
        enabled: true,
        usePlaywright: true,
        includePathQuery: true,
        interval_minutes: 30,
        proxy: '',
        country: '',
        referer: '',
        links: [{ url: '', solver: 'puppeteer', ratio: 1 }]
    });

    // Modal state for Add Proxy
    const [proxyModalOpen, setProxyModalOpen] = useState(false);
    const [newProxyLine, setNewProxyLine] = useState('');

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [cRes, pRes, sRes] = await Promise.all([
                axios.get(`${API_URL}?action=cps_campaigns`),
                axios.get(`${API_URL}?action=cps_proxies`),
                axios.get(`${API_URL}?action=cps_campaigns_status`)
            ]);
            setCampaigns(cRes.data ? Object.entries(cRes.data).map(([name, conf]) => ({ name, ...conf })) : []);
            setProxies(Array.isArray(pRes.data) ? pRes.data : []);
            setStatuses(Array.isArray(sRes.data) ? sRes.data : []);
        } catch (err) {
            console.error('Failed to load CPS data', err);
            setError('Failed to communicate with CPS backend service');
        } finally {
            setLoading(false);
        }
    };

    const loadLogs = async () => {
        try {
            const res = await axios.get(`${API_URL}?action=cps_rotation_logs&lines=60`);
            setLogs(res.data?.logs || []);
        } catch (e) {
            console.error('Failed to load rotation logs', e);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (subTab === 'logs') {
            loadLogs();
            const interval = setInterval(loadLogs, 10000);
            return () => clearInterval(interval);
        }
    }, [subTab]);

    // Save Campaign
    const handleSaveCampaign = async (e) => {
        e.preventDefault();
        try {
            const validLinks = campaignForm.links.filter(l => l.url.trim());
            if (validLinks.length === 0) {
                alert('At least one link target is required');
                return;
            }
            const payload = {
                name: campaignForm.name.trim(),
                campaign: {
                    enabled: Boolean(campaignForm.enabled),
                    usePlaywright: Boolean(campaignForm.usePlaywright),
                    includePathQuery: Boolean(campaignForm.includePathQuery),
                    interval_minutes: Number(campaignForm.interval_minutes) || 30,
                    proxy: campaignForm.proxy.trim() || undefined,
                    country: campaignForm.country.trim().toUpperCase() || undefined,
                    referer: campaignForm.referer.trim() || undefined,
                    links: validLinks.map(l => ({
                        url: l.url.trim(),
                        solver: l.solver || 'puppeteer',
                        ratio: Number(l.ratio) || 1
                    }))
                }
            };
            await axios.post(`${API_URL}?action=cps_campaigns`, payload);
            setCampaignModalOpen(false);
            loadData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save campaign');
        }
    };

    // Delete Campaign
    const handleDeleteCampaign = async (name) => {
        if (!window.confirm(`Delete campaign "${name}"?`)) return;
        try {
            await axios.post(`${API_URL}?action=cps_campaign_delete`, { name });
            loadData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete');
        }
    };

    // Save Proxies
    const handleAddProxy = async (e) => {
        e.preventDefault();
        if (!newProxyLine.trim()) return;
        const parts = newProxyLine.trim().split(':');
        if (parts.length < 2) {
            alert('Format: host:port or host:port:user:pass:country');
            return;
        }
        const newProxyObj = {
            host: parts[0],
            port: Number(parts[1]),
            username: parts[2] || '',
            password: parts[3] || '',
            country: (parts[4] || 'US').toUpperCase()
        };
        const updated = [...proxies, newProxyObj];
        try {
            await axios.post(`${API_URL}?action=cps_proxies`, { proxies: updated });
            setNewProxyLine('');
            setProxyModalOpen(false);
            loadData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save proxy');
        }
    };

    const handleDeleteProxy = async (idx) => {
        const updated = proxies.filter((_, i) => i !== idx);
        try {
            await axios.post(`${API_URL}?action=cps_proxies`, { proxies: updated });
            loadData();
        } catch (err) {
            alert('Failed to remove proxy');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-3">
                        <span>CPS — Campaign, Proxy & Solver Engine</span>
                    </h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        Manage auto-rotations, proxies, solver health and link generation
                    </p>
                </div>

                {/* Sub-navigation tabs */}
                <div className="flex items-center gap-2 bg-[var(--color-bg-soft)] p-1.5 rounded-xl border border-[var(--color-border)]">
                    <button
                        onClick={() => setSubTab('campaigns')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            subTab === 'campaigns'
                                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`}
                    >
                        <Sliders size={16} />
                        Campaigns
                    </button>
                    <button
                        onClick={() => setSubTab('proxies')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            subTab === 'proxies'
                                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`}
                    >
                        <Server size={16} />
                        Proxies
                    </button>
                    <button
                        onClick={() => setSubTab('status')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            subTab === 'status'
                                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`}
                    >
                        <Activity size={16} />
                        Status & Health
                    </button>
                    <button
                        onClick={() => setSubTab('logs')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            subTab === 'logs'
                                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`}
                    >
                        <Terminal size={16} />
                        Rotation Logs
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={loadData} className="underline text-sm font-semibold">Retry</button>
                </div>
            )}

            {/* TAB: CAMPAIGNS */}
            {subTab === 'campaigns' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-[var(--color-text-muted)]">
                            {campaigns.length} registered rotation campaigns
                        </span>
                        <button
                            onClick={() => {
                                setCampaignForm({
                                    name: '',
                                    enabled: true,
                                    usePlaywright: true,
                                    includePathQuery: true,
                                    interval_minutes: 30,
                                    proxy: '',
                                    country: '',
                                    referer: '',
                                    links: [{ url: '', solver: 'puppeteer', ratio: 1 }]
                                });
                                setEditingCampaignName(null);
                                setCampaignModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold shadow hover:opacity-90"
                        >
                            <Plus size={16} />
                            Add Campaign
                        </button>
                    </div>

                    <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5">Campaign Name</th>
                                    <th className="px-6 py-3.5">Proxy / Country</th>
                                    <th className="px-6 py-3.5">Interval</th>
                                    <th className="px-6 py-3.5">Links</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {campaigns.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-[var(--color-text-muted)]">
                                            No CPS rotation campaigns configured. Click "Add Campaign" to create one.
                                        </td>
                                    </tr>
                                ) : (
                                    campaigns.map((camp) => (
                                        <tr key={camp.name} className="hover:bg-[var(--color-bg-soft)] transition-colors">
                                            <td className="px-6 py-4">
                                                {camp.enabled ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 size={12} /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
                                                        <XCircle size={12} /> Disabled
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-[var(--color-text-primary)]">
                                                {camp.name}
                                            </td>
                                            <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                                                {camp.country ? `${camp.country} ` : ''}
                                                {camp.proxy ? `(${camp.proxy})` : <span className="text-[var(--color-text-muted)]">Default pool</span>}
                                            </td>
                                            <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                                                {camp.interval_minutes || 30} mins
                                            </td>
                                            <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                                                {camp.links?.length || 0} destinations
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleDeleteCampaign(camp.name)}
                                                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: PROXIES */}
            {subTab === 'proxies' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-[var(--color-text-muted)]">
                            {proxies.length} residential/datacenter rotation proxies
                        </span>
                        <button
                            onClick={() => setProxyModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold shadow hover:opacity-90"
                        >
                            <Plus size={16} />
                            Add Proxy
                        </button>
                    </div>

                    <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5">Host</th>
                                    <th className="px-6 py-3.5">Port</th>
                                    <th className="px-6 py-3.5">Country</th>
                                    <th className="px-6 py-3.5">Auth</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {proxies.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-[var(--color-text-muted)]">
                                            No proxies configured.
                                        </td>
                                    </tr>
                                ) : (
                                    proxies.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-[var(--color-bg-soft)] transition-colors">
                                            <td className="px-6 py-4 font-mono font-medium text-[var(--color-text-primary)]">
                                                {p.host}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-[var(--color-text-secondary)]">
                                                {p.port}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
                                                    {p.country || 'ALL'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[var(--color-text-muted)]">
                                                {p.username ? 'User/Password' : 'IP Whitelist'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteProxy(idx)}
                                                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: STATUS & HEALTH */}
            {subTab === 'status' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {statuses.map((item) => (
                        <div key={item.name} className="p-5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-base text-[var(--color-text-primary)]">{item.name}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    item.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-500/10 text-zinc-500'
                                }`}>
                                    {item.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>

                            <div className="text-xs space-y-1.5 text-[var(--color-text-secondary)]">
                                <div><span className="text-[var(--color-text-muted)]">Solver:</span> {item.solver || 'direct / puppeteer'}</div>
                                <div><span className="text-[var(--color-text-muted)]">Last Generated:</span> {item.lastGeneratedAt ? new Date(item.lastGeneratedAt).toLocaleString() : 'Never'}</div>
                                {item.proxyUsed && <div><span className="text-[var(--color-text-muted)]">Proxy Used:</span> <span className="font-mono">{item.proxyUsed}</span></div>}
                            </div>

                            {item.lastUrl && (
                                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                                    <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-1">Generated Target URL:</div>
                                    <a
                                        href={item.lastUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-[var(--color-primary)] break-all flex items-center gap-1 hover:underline font-mono"
                                    >
                                        <ExternalLink size={12} className="shrink-0" />
                                        {item.lastUrl}
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* TAB: ROTATION LOGS */}
            {subTab === 'logs' && (
                <div className="bg-zinc-950 text-zinc-200 font-mono text-xs rounded-2xl p-4 overflow-x-auto border border-zinc-800 h-[600px] flex flex-col">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-800 text-zinc-400">
                        <span>CPS Service Logs (Auto-refreshing)</span>
                        <button onClick={loadLogs} className="hover:text-white transition-colors">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1">
                        {logs.length === 0 ? (
                            <div className="text-zinc-600 text-center py-20">No logs captured yet</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="leading-relaxed hover:bg-zinc-900 px-1 rounded">
                                    {typeof log === 'object' ? JSON.stringify(log) : log}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Add Campaign Modal */}
            {campaignModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Configure Campaign</h2>
                        <form onSubmit={handleSaveCampaign} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1">Campaign Identifier</label>
                                <input
                                    type="text"
                                    required
                                    disabled={Boolean(editingCampaignName)}
                                    value={campaignForm.name}
                                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] text-sm"
                                    placeholder="e.g. facebook_crypto_uk"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1">Interval (Mins)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={campaignForm.interval_minutes}
                                        onChange={(e) => setCampaignForm({ ...campaignForm, interval_minutes: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1">Target Country</label>
                                    <input
                                        type="text"
                                        maxLength="2"
                                        value={campaignForm.country}
                                        onChange={(e) => setCampaignForm({ ...campaignForm, country: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] text-sm uppercase"
                                        placeholder="e.g. GB"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1">Target Links</label>
                                {campaignForm.links.map((link, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input
                                            type="url"
                                            required
                                            value={link.url}
                                            onChange={(e) => {
                                                const updated = [...campaignForm.links];
                                                updated[idx].url = e.target.value;
                                                setCampaignForm({ ...campaignForm, links: updated });
                                            }}
                                            className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] text-sm"
                                            placeholder="https://cloaked-target.com"
                                        />
                                        <select
                                            value={link.solver}
                                            onChange={(e) => {
                                                const updated = [...campaignForm.links];
                                                updated[idx].solver = e.target.value;
                                                setCampaignForm({ ...campaignForm, links: updated });
                                            }}
                                            className="px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] text-xs"
                                        >
                                            <option value="puppeteer">Puppeteer</option>
                                            <option value="curl">cURL Fast</option>
                                            <option value="direct">Direct</option>
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                                <button
                                    type="button"
                                    onClick={() => setCampaignModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold"
                                >
                                    Save Campaign
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Proxy Modal */}
            {proxyModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-6 max-w-md w-full shadow-2xl">
                        <h2 className="text-xl font-bold mb-3 text-[var(--color-text-primary)]">Add Proxy</h2>
                        <form onSubmit={handleAddProxy} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1">
                                    Proxy Endpoint String
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newProxyLine}
                                    onChange={(e) => setNewProxyLine(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] text-sm font-mono"
                                    placeholder="host:port:user:pass:country"
                                />
                                <span className="text-xs text-[var(--color-text-muted)] mt-1 block">
                                    Example: 194.26.229.4:8000:myuser:mypass:US
                                </span>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                                <button
                                    type="button"
                                    onClick={() => setProxyModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold"
                                >
                                    Save Proxy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CpsPage;
