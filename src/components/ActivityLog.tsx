import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  History, Search, Filter, MessageSquare, PlusCircle, 
  RefreshCw, Paperclip, CheckSquare, Tag, AlertTriangle, User 
} from 'lucide-react';
import { fetchChangelog } from '../lib/api';
import { ChangelogEntry } from '../types';

export default function ActivityLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const { data: logs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['changelog'],
    queryFn: () => fetchChangelog(undefined, 100),
    refetchInterval: 10000 // Refetch every 10 seconds
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'request_created':
        return { icon: PlusCircle, color: 'text-green-400 bg-green-500/10 border-green-500/20' };
      case 'status_change':
        return { icon: RefreshCw, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'priority_change':
        return { icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case 'comment_added':
        return { icon: MessageSquare, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      case 'attachment_added':
        return { icon: Paperclip, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      case 'checklist_updated':
        return { icon: CheckSquare, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'tags_updated':
        return { icon: Tag, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' };
      default:
        return { icon: History, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' };
    }
  };

  const filteredLogs = logs.filter(log => {
    const summaryText = log.summary || '';
    const reqId = log.request_id || '';
    const authorName = log.author || '';

    const matchesSearch = 
      summaryText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reqId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      authorName.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesFilter = filterType === 'all' || log.change_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full text-gray-200 bg-gray-950 font-sans">
      {/* Header section */}
      <div className="p-6 border-b border-gray-800 bg-gray-900/40 shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <History className="w-5 h-5 text-yellow-500" />
              Activity Audit Log
            </h2>
            <p className="text-xs text-gray-400 mt-1">Audit log of all modifications, comment events, and ticket workflows</p>
          </div>
          <button 
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket ID, summary, or author..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-yellow-500 transition-colors"
            >
              <option value="all">All Events</option>
              <option value="request_created">Created</option>
              <option value="status_change">Status Changed</option>
              <option value="priority_change">Priority Changed</option>
              <option value="comment_added">Comments</option>
              <option value="attachment_added">Attachments</option>
              <option value="checklist_updated">Tasks</option>
              <option value="tags_updated">Tags</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline view */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-gray-950">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-yellow-500 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading audit timeline...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            Failed to fetch logs: {(error as Error).message}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            No audit records match the current filters.
          </div>
        ) : (
          <div className="relative border-l border-gray-800 ml-4 pl-6 space-y-6">
            {filteredLogs.map((log) => {
              const cfg = getEventIcon(log.change_type);
              const EventIcon = cfg.icon;
              return (
                <div key={log.id} className="relative group">
                  {/* Timeline icon */}
                  <div className={`absolute -left-[35px] top-1.5 w-[18px] h-[18px] rounded-full border flex items-center justify-center z-10 ${cfg.color}`}>
                    <EventIcon className="w-2.5 h-2.5" />
                  </div>

                  {/* Card content */}
                  <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 hover:bg-gray-900 transition-all shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded font-bold border border-yellow-500/20">
                          {log.request_id}
                        </span>
                        <span className="text-xs text-gray-400 capitalize">
                          {log.change_type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-gray-200">{log.summary}</p>

                    {/* Change Details */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2.5 p-2 rounded bg-black/30 border border-gray-800/30 text-[11px] font-mono text-gray-400 space-y-1">
                        {Object.entries(log.details).map(([key, value]) => {
                          const formattedKey = key.replace('_', ' ');
                          return (
                            <div key={key} className="flex gap-2">
                              <span className="text-gray-600 capitalize shrink-0">{formattedKey}:</span>
                              <span className="text-gray-300 break-all">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-800/50 text-[11px] text-gray-500">
                      <User className="w-3.5 h-3.5" />
                      <span>By: <span className="text-gray-400 font-semibold">{log.author}</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
