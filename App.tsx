import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Settings, GeneratedVideo, VeoModel, AspectRatio, Resolution, GenerationTask } from './types';
import { startVideoGeneration, checkVideoOperationStatus, fetchVideoFromUri } from './services/geminiService';
import { FilmIcon, UploadIcon, XCircleIcon, DownloadIcon, EyeIcon, EyeOffIcon } from './components/icons';

// --- Helper Components ---

const QuotaExhaustedModal = ({ onReset }: { onReset: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-sm w-full text-center border border-red-500/50">
            <h3 className="text-2xl font-bold text-white mb-4">Quota Harian Habis</h3>
            <p className="text-gray-300 mb-6">
                Semua kunci API yang Anda berikan telah mencapai batas kuota harian. Silakan coba lagi besok atau tambahkan kunci API baru.
            </p>
            <button
                onClick={onReset}
                className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
                OK
            </button>
        </div>
    </div>
);

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => (
    <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
            <FilmIcon className="w-16 h-16 mx-auto text-blue-400 mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">Veo Video Generator</h1>
            <p className="text-gray-400 mb-8">Silakan masuk untuk melanjutkan.</p>
            <button
                onClick={onLogin}
                className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors text-lg"
            >
                Masuk
            </button>
        </div>
    </div>
);


interface SettingsPanelProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  onGenerate: () => void;
  isGenerating: boolean;
  clearPrompt: () => void;
  clearHistory: () => void;
  apiKeys: string[];
  setApiKeys: (keys: string[]) => void;
  logout: () => void;
}
const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings, onGenerate, isGenerating, clearPrompt, clearHistory, apiKeys, setApiKeys, logout }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localKeys, setLocalKeys] = useState(apiKeys.join('\n'));
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(false);

  const handleSaveKeys = () => {
      const keys = localKeys.split('\n').map(k => k.trim()).filter(Boolean);
      const apiKeyRegex = /^AIza[0-9A-Za-z\\-_]{35}$/;
      let hasInvalidKey = false;

      for (const key of keys) {
        if (!apiKeyRegex.test(key)) {
            hasInvalidKey = true;
            break;
        }
      }

      if (hasInvalidKey) {
          setApiKeyError("Kunci tidak valid ditemukan. Kunci harus diawali dengan 'AIza' dan memiliki panjang 39 karakter.");
          return;
      }

      setApiKeyError(null);
      setApiKeys(keys);
  };

  const handleLocalKeysChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalKeys(e.target.value);
    if (apiKeyError) {
        setApiKeyError(null);
    }
  };

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      setSettings(prev => ({ ...prev, image: files[0] }));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSettings(prev => ({ ...prev, image: e.dataTransfer.files[0] }));
      e.dataTransfer.clearData();
    }
  };

  const removeImage = () => {
    setSettings(prev => ({ ...prev, image: null }));
  };

  return (
    <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-800 p-6 flex flex-col h-full overflow-y-auto">
      <div className="flex-grow">
        <div className="flex items-center mb-6">
          <FilmIcon className="w-8 h-8 mr-3 text-blue-400" />
          <h2 className="text-2xl font-bold">Veo Generator</h2>
        </div>

        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
          <textarea
            id="prompt"
            rows={4}
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            value={settings.prompt}
            onChange={(e) => setSettings(prev => ({ ...prev, prompt: e.target.value }))}
            placeholder="A neon hologram of a cat driving..."
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Gambar Awal (Opsional)</label>
          <label
            htmlFor="file-upload"
            className={`relative flex justify-center items-center w-full h-32 px-4 transition bg-gray-700 border-2 ${isDragging ? 'border-blue-500' : 'border-gray-600'} border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-500 focus:outline-none`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {settings.image ? (
              <>
                <img src={URL.createObjectURL(settings.image)} alt="Preview" className="max-h-full max-w-full object-contain rounded" />
                <button
                  onClick={removeImage}
                  className="absolute top-1 right-1 bg-gray-900/50 hover:bg-gray-900/80 rounded-full p-1 text-white"
                  aria-label="Remove image"
                >
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </>
            ) : (
              <span className="flex items-center space-x-2">
                <UploadIcon className="w-6 h-6 text-gray-400" />
                <span className="font-medium text-gray-400">
                  Jatuhkan file atau <span className="text-blue-400">klik untuk mengunggah</span>
                </span>
              </span>
            )}
            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
          </label>
        </div>

        <div className="mb-4">
            <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-2">Model</label>
            <select
                id="model"
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={settings.model}
                onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value as VeoModel }))}
            >
                <option value="veo-3.1-fast-generate-preview">Veo Fast</option>
                <option value="veo-3.1-generate-preview">Veo High Quality</option>
            </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300 mb-2">Aspek Rasio</label>
            <select
              id="aspectRatio"
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={settings.aspectRatio}
              onChange={(e) => setSettings(prev => ({ ...prev, aspectRatio: e.target.value as AspectRatio }))}
            >
              <option value="16:9">16:9 (Lanskap)</option>
              <option value="9:16">9:16 (Potret)</option>
            </select>
          </div>
          <div>
            <label htmlFor="resolution" className="block text-sm font-medium text-gray-300 mb-2">Resolusi</label>
            <select
              id="resolution"
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={settings.resolution}
              onChange={(e) => setSettings(prev => ({ ...prev, resolution: e.target.value as Resolution }))}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating || !settings.prompt.trim()}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Menghasilkan...' : 'Hasilkan Video'}
        </button>

        <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold mb-2">Kunci API</h3>
            <p className="text-sm text-gray-400 mb-3">
                Masukkan kunci API Anda, satu per baris. Aplikasi akan secara otomatis beralih jika batas kuota tercapai. 
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">Info Penagihan</a>
            </p>
            <div className="relative">
                <textarea
                    rows={4}
                    className={`w-full bg-gray-700 border ${apiKeyError ? 'border-red-500' : 'border-gray-600'} rounded-md p-2 text-white focus:ring-2 ${apiKeyError ? 'focus:ring-red-500' : 'focus:ring-blue-500'} focus:border-blue-500 transition pr-10`}
                    value={localKeys}
                    onChange={handleLocalKeysChange}
                    placeholder="AIza..."
                    spellCheck="false"
                    aria-invalid={!!apiKeyError}
                    aria-describedby="api-key-error"
                    style={{ fontFamily: showKeys ? 'inherit' : 'monospace', letterSpacing: showKeys ? 'inherit' : '0.2em' }}
                    type={showKeys ? 'text' : 'password'}
                />
                <button
                    onClick={() => setShowKeys(!showKeys)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white"
                    aria-label={showKeys ? "Sembunyikan kunci" : "Tampilkan kunci"}
                >
                    {showKeys ? <EyeOffIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                </button>
            </div>
            {apiKeyError && <p id="api-key-error" className="text-red-500 text-sm mt-1">{apiKeyError}</p>}

            <button
                onClick={handleSaveKeys}
                className="w-full mt-3 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
                Simpan Kunci
            </button>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col space-y-2">
        <button onClick={clearPrompt} className="text-sm text-gray-400 hover:text-white transition-colors">Bersihkan Prompt</button>
        <button onClick={clearHistory} className="text-sm text-gray-400 hover:text-white transition-colors">Bersihkan Riwayat</button>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition-colors">Keluar</button>
      </div>
    </div>
  );
};


const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [apiKeys, setApiKeys] = useState<string[]>([]);
    const [showQuotaExhaustedModal, setShowQuotaExhaustedModal] = useState(false);
    const [tasks, setTasks] = useState<GenerationTask[]>([]);
    const isPolling = useRef<Set<string>>(new Set());

    const [settings, setSettings] = useState<Settings>({
        prompt: '',
        image: null,
        model: 'veo-3.1-fast-generate-preview',
        aspectRatio: '16:9',
        resolution: '720p',
    });

    useEffect(() => {
        try {
            const storedKeys = localStorage.getItem('apiKeys');
            if (storedKeys) {
                setApiKeys(JSON.parse(storedKeys));
            }
            const storedTasks = localStorage.getItem('videoTasks');
            if (storedTasks) {
                setTasks(JSON.parse(storedTasks).map((task: GenerationTask) => {
                    if (task.status === 'generating' || task.status === 'polling') {
                        return { ...task, status: 'error', error: 'Generation was interrupted.' };
                    }
                    return task;
                }));
            }
        } catch (error) {
            console.error("Gagal memuat dari localStorage:", error);
        }
    }, []);

    const handleSetApiKeys = (keys: string[]) => {
        setApiKeys(keys);
        localStorage.setItem('apiKeys', JSON.stringify(keys));
    };

    useEffect(() => {
        try {
            localStorage.setItem('videoTasks', JSON.stringify(tasks));
        } catch (error) {
            console.error("Gagal menyimpan tugas ke localStorage:", error);
        }
    }, [tasks]);

    const handleLogin = async () => {
        try {
            if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
                await window.aistudio.openSelectKey();
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error("Gagal membuka dialog pemilihan kunci:", error);
        }
    };
    
    const handleLogout = () => {
        setIsAuthenticated(false);
    };
    
    const pollTaskStatus = useCallback(async (taskId: string, operation: any, apiKey: string) => {
        if (isPolling.current.has(taskId)) return;
        isPolling.current.add(taskId);
    
        try {
            let currentOperation = operation;
            while (!currentOperation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                
                try {
                    currentOperation = await checkVideoOperationStatus(currentOperation, apiKey);
                } catch (error: any) {
                    if (error.message.includes('API key not valid')) {
                       throw new Error('RETRY_WITH_NEXT_KEY');
                    }
                    throw error;
                }
                
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'polling' } : t));
            }
    
            const uri = currentOperation.response?.generatedVideos?.[0]?.video?.uri;
            if (!uri) {
                throw new Error("URI video tidak ditemukan dalam respons operasi.");
            }
    
            const videoUrl = await fetchVideoFromUri(uri, apiKey);
            
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'complete', videoUrl, operation: undefined } : t));
    
        } catch (error: any) {
             if (error.message === 'RETRY_WITH_NEXT_KEY') {
                throw error;
            }
            console.error(`Gagal polling untuk tugas ${taskId}:`, error);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: error.message } : t));
        } finally {
            isPolling.current.delete(taskId);
        }
    }, []);

    const handleGenerate = useCallback(async (keyIndex = 0) => {
        if (!settings.prompt.trim() || tasks.some(t => t.status === 'generating' || t.status === 'polling')) return;
        if (apiKeys.length === 0) {
            alert("Silakan masukkan setidaknya satu kunci API di pengaturan.");
            return;
        }
        if (keyIndex >= apiKeys.length) {
            setShowQuotaExhaustedModal(true);
            const lastErroringTask = tasks.find(t => t.status === 'error' && t.error?.includes('Mencoba kunci berikutnya...'));
            if(lastErroringTask) {
              setTasks(prev => prev.map(t => (t.id === lastErroringTask.id ? { ...t, status: 'error', error: 'Semua kunci API gagal atau telah mencapai kuota.' } : t)));
            }
            return;
        }
    
        const currentApiKey = apiKeys[keyIndex];
        const taskId = new Date().toISOString();
        
        let taskToRetry = tasks.find(t => t.status === 'error' && t.error?.includes('Mencoba kunci berikutnya...'));
        
        if (taskToRetry) {
             setTasks(prev => prev.map(t => (t.id === taskToRetry.id ? { ...t, status: 'generating' } : t)));
        } else {
            const newTask: GenerationTask = { id: taskId, prompt: settings.prompt, settings, status: 'generating' };
            setTasks(prev => [newTask, ...prev]);
            taskToRetry = newTask;
        }

        try {
            const operation = await startVideoGeneration(taskToRetry.settings, currentApiKey);
            setTasks(prev => prev.map(t => t.id === taskToRetry.id ? { ...t, operation, status: 'polling' } : t));
            await pollTaskStatus(taskToRetry.id, operation, currentApiKey);
        } catch (error: any) {
            console.error(`Gagal dengan kunci API #${keyIndex}:`, error);
            if (error.message.includes('quota') || error.message.includes('API key not valid') || error.message === 'RETRY_WITH_NEXT_KEY') {
                setTasks(prev => prev.map(t => (t.id === taskToRetry.id ? { ...t, status: 'error', error: `Kunci #${keyIndex+1} gagal. Mencoba kunci berikutnya...` } : t)));
                setTimeout(() => {
                    handleGenerate(keyIndex + 1);
                }, 1000);
            } else {
                 setTasks(prev => prev.map(t => t.id === taskToRetry.id ? { ...t, status: 'error', error: error.message } : t));
            }
        }
    }, [settings, tasks, apiKeys, pollTaskStatus]);

    const isGenerating = tasks.some(t => t.status === 'generating' || t.status === 'polling');

    const clearPrompt = () => setSettings(prev => ({...prev, prompt: '', image: null}));
    const clearHistory = () => {
        tasks.forEach(task => {
            if (task.videoUrl) {
                URL.revokeObjectURL(task.videoUrl);
            }
        });
        setTasks([]);
        localStorage.removeItem('videoTasks');
    };

    if (!isAuthenticated) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {showQuotaExhaustedModal && <QuotaExhaustedModal onReset={() => setShowQuotaExhaustedModal(false)} />}
            <SettingsPanel
                settings={settings}
                setSettings={setSettings}
                onGenerate={() => handleGenerate(0)}
                isGenerating={isGenerating}
                clearPrompt={clearPrompt}
                clearHistory={clearHistory}
                apiKeys={apiKeys}
                setApiKeys={handleSetApiKeys}
                logout={handleLogout}
            />
            <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                <h1 className="text-3xl font-bold mb-6">Riwayat Generasi</h1>
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <FilmIcon className="w-24 h-24 mb-4" />
                        <p className="text-xl">Belum ada video yang dihasilkan.</p>
                        <p>Gunakan panel di sebelah kiri untuk memulai.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {tasks.map(task => (
                            <div key={task.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 flex flex-col">
                                <div className="aspect-video bg-gray-700 flex items-center justify-center">
                                    {task.status === 'complete' && task.videoUrl ? (
                                        <video controls src={task.videoUrl} className="w-full h-full object-cover" />
                                    ) : task.status === 'error' ? (
                                        <div className="p-4 text-center text-red-400">
                                            <p className="font-bold">Error</p>
                                            <p className="text-xs mt-1">{task.error}</p>
                                        </div>
                                    ) : (
                                        <div className="text-center p-4">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                                            <p className="mt-4 text-sm text-gray-300 font-medium">
                                                {task.status === 'generating' && 'Memulai generasi...'}
                                                {task.status === 'polling' && 'Memproses video...'}
                                                {task.status === 'pending' && 'Tertunda...'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <p className="text-gray-300 text-sm flex-grow line-clamp-3" title={task.prompt}>{task.prompt}</p>
                                    <div className="text-xs text-gray-400 mt-2">
                                        <p>Model: {task.settings.model}</p>
                                        <p>Rasio: {task.settings.aspectRatio} | Resolusi: {task.settings.resolution}</p>
                                    </div>
                                    {task.status === 'complete' && task.videoUrl && (
                                        <a
                                            href={task.videoUrl}
                                            download={`veo-video-${task.id}.mp4`}
                                            className="mt-4 w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                                        >
                                            <DownloadIcon className="w-5 h-5 mr-2" />
                                            Unduh
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
