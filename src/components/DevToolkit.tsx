import React, { useState } from 'react';
import { Wrench, Braces, Binary, Key, RefreshCw, Copy, Check, Search, FileCode, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DevToolkit() {
  const [activeTool, setActiveTool] = useState<'json' | 'base64' | 'jwt' | 'search'>('json');

  const tools = [
    { id: 'json', icon: Braces, label: 'JSON Formatter' },
    { id: 'base64', icon: Binary, label: 'Base64 Encoder' },
    { id: 'jwt', icon: Key, label: 'JWT Decoder' },
    { id: 'search', icon: Search, label: 'Code Search' },
  ];

  return (
    <div className="flex h-full text-gray-200">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800 bg-gray-900/50 flex flex-col p-4 space-y-2">
        <h3 className="font-semibold text-gray-300 flex items-center gap-2 mb-4 px-2">
          <Wrench className="w-5 h-5 text-amber-500" />
          Dev Toolkit
        </h3>
        
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as any)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTool === tool.id 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <tool.icon className="w-4 h-4" />
            {tool.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-950 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 overflow-y-auto"
          >
            {activeTool === 'json' && <JsonFormatter />}
            {activeTool === 'base64' && <Base64Tool />}
            {activeTool === 'jwt' && <JwtDecoder />}
            {activeTool === 'search' && <CodeSearch />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function JsonFormatter() {
  const [input, setInput] = useState('{"hello": "world", "nested": {"array": [1, 2, 3]}}');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const formatJson = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">JSON Formatter & Validator</h2>
        <div className="flex gap-2">
          <button onClick={formatJson} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors">Format</button>
          <button onClick={minifyJson} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors">Minify</button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste raw JSON here..."
          className="bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-gray-300 resize-none focus:outline-none focus:border-amber-500 transition-colors"
          spellCheck="false"
        />
        <div className="relative flex flex-col">
          <div className={`flex-1 bg-gray-900 border ${error ? 'border-red-500/50' : 'border-gray-800'} rounded-lg p-4 font-mono text-sm overflow-auto`}>
            {error ? (
              <div className="text-red-400">Invalid JSON: {error}</div>
            ) : (
              <pre className="text-green-400 m-0">{output}</pre>
            )}
          </div>
          {output && !error && (
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Base64Tool() {
  const [input, setInput] = useState('Hello World!');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode'|'decode'>('encode');

  const process = (val: string, currentMode: 'encode'|'decode') => {
    setInput(val);
    try {
      if (currentMode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(val))));
      } else {
        setOutput(decodeURIComponent(escape(atob(val))));
      }
    } catch (e) {
      setOutput('Error: Invalid input for decoding');
    }
  };

  // Run initial conversion
  React.useEffect(() => { process(input, mode); }, [mode]);

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Base64 Encoder / Decoder</h2>
        <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
          <button 
            onClick={() => setMode('encode')} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'encode' ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}
          >
            Encode
          </button>
          <button 
            onClick={() => setMode('decode')} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'decode' ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}
          >
            Decode
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Input String</label>
          <textarea
            value={input}
            onChange={(e) => process(e.target.value, mode)}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-gray-300 resize-none focus:outline-none focus:border-amber-500 transition-colors"
            spellCheck="false"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Output (Base64)</label>
          <textarea
            value={output}
            readOnly
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-green-400 resize-none focus:outline-none transition-colors"
            spellCheck="false"
          />
        </div>
      </div>
    </div>
  );
}

function JwtDecoder() {
  const [token, setToken] = useState('');
  const [header, setHeader] = useState('');
  const [payload, setPayload] = useState('');
  const [error, setError] = useState('');

  const decodeJwt = (jwt: string) => {
    setToken(jwt);
    if (!jwt.trim()) {
      setHeader(''); setPayload(''); setError(''); return;
    }
    
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) throw new Error('JWT must have 3 parts (header.payload.signature)');
      
      const h = JSON.parse(atob(parts[0]));
      const p = JSON.parse(atob(parts[1]));
      
      setHeader(JSON.stringify(h, null, 2));
      setPayload(JSON.stringify(p, null, 2));
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setHeader('');
      setPayload('');
    }
  };

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white mb-2">JWT Decoder</h2>
      
      <div className="flex flex-col gap-2 shrink-0">
        <label className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Encoded Token</label>
        <textarea
          value={token}
          onChange={(e) => decodeJwt(e.target.value)}
          placeholder="Paste your JWT (ey...)"
          className="h-24 bg-gray-900 border border-gray-800 rounded-lg p-3 font-mono text-sm text-pink-400 resize-none focus:outline-none focus:border-amber-500 transition-colors break-all"
          spellCheck="false"
        />
        {error && <div className="text-red-400 text-sm mt-1">{error}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 mt-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Header (ALGORITHM & TOKEN TYPE)</label>
          <pre className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-blue-400 overflow-auto m-0">
            {header || '...'}
          </pre>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Payload (DATA)</label>
          <pre className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-emerald-400 overflow-auto m-0">
            {payload || '...'}
          </pre>
        </div>
      </div>
    </div>
  );
}

function CodeSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/system/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setResults(data.results);
      } else {
        setError(data.detail || 'Search failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = async (result: any) => {
    setSelectedFile(result.file);
    setSelectedLine(result.line);
    setLoadingFile(true);
    try {
      const res = await fetch(`/api/system/cat?file=${encodeURIComponent(result.file)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setFileContent(data.content);
        // Scroll target line into view after a brief timeout to let DOM render
        setTimeout(() => {
          const el = document.getElementById(`line-${result.line}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        setFileContent(`Error loading file: ${data.detail}`);
      }
    } catch (err) {
      setFileContent(`Error loading file: ${(err as Error).message}`);
    } finally {
      setLoadingFile(false);
    }
  };

  const copyFileToClipboard = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel: Search Form & Results */}
      <div className="w-[380px] border-r border-gray-800 bg-gray-950 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-gray-800 shrink-0">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-500" />
            Workspace Code Search
          </h2>
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files (e.g. mockEngine)..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-3 pr-10 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </form>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-sm">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
              Searching workspace files...
            </div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No matches found for "{query}"
            </div>
          )}
          {results.map((res, index) => {
            const isSelected = selectedFile === res.file && selectedLine === res.line;
            return (
              <button
                key={`${res.file}-${res.line}-${index}`}
                onClick={() => handleSelectResult(res)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-gray-900/50 hover:bg-gray-800/50 border-gray-800/60 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between w-full font-medium">
                  <span className="truncate text-gray-200" title={res.file}>
                    {res.file.split('/').pop()}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono scale-90">
                    Line {res.line}
                  </span>
                </div>
                <div className="text-gray-400 truncate font-mono text-[11px] bg-black/30 px-1.5 py-1 rounded w-full border border-gray-900">
                  {res.content}
                </div>
                <div className="text-[10px] text-gray-500 truncate mt-0.5">
                  {res.file}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel: Code Viewer */}
      <div className="flex-1 flex flex-col h-full bg-gray-950 overflow-hidden">
        {selectedFile ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="px-4 py-3 bg-gray-900/60 border-b border-gray-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white leading-tight">
                    {selectedFile.split('/').pop()}
                  </h3>
                  <p className="text-[11px] text-gray-400 leading-none mt-0.5">{selectedFile}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyFileToClipboard}
                  className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                  title="Copy File"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="flex-1 overflow-auto font-mono text-[13px] leading-relaxed bg-gray-950 relative">
              {loadingFile ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
              ) : (
                <div className="py-4 select-text min-w-max">
                  {fileContent.split('\n').map((line, idx) => {
                    const lineNum = idx + 1;
                    const isMatched = lineNum === selectedLine;
                    return (
                      <div
                        key={lineNum}
                        id={`line-${lineNum}`}
                        className={`flex items-start px-4 transition-colors ${
                          isMatched
                            ? 'bg-amber-500/15 border-l-4 border-amber-500 text-amber-300 font-semibold'
                            : 'hover:bg-gray-900/40 border-l-4 border-transparent text-gray-400'
                        }`}
                      >
                        <span className="w-12 select-none text-right pr-4 text-gray-600 font-mono text-[11px]">
                          {lineNum}
                        </span>
                        <pre className="m-0 whitespace-pre font-mono text-gray-200">
                          {line || ' '}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
            <FileCode className="w-16 h-16 text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-1">No File Selected</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Use the search box on the left to find references in your codebase, then select a match to view its file content here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
