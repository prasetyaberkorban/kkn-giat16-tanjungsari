"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  File, Folder, Image as ImageIcon, Video, FileText, Download, Eye, 
  LayoutGrid, List, Loader2, ChevronRight, Home, X, Upload, CheckCircle, Clock, Trash2, AlertTriangle, MoreVertical, Plus, FolderPlus, ArrowLeft
} from "lucide-react";

const DEFAULT_FOLDER_ID = "1QhsHdVg2vTq7_PEHfT7qLbMA5zCzglLR";
const DEFAULT_FOLDER_NAME = "Drive KKN GIAT 16 DESA TANJUNGSARI";

export default function DriveDashboard() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState(DEFAULT_FOLDER_ID);
  const [folderHistory, setFolderHistory] = useState<{id: string, name: string}[]>([{id: DEFAULT_FOLDER_ID, name: DEFAULT_FOLDER_NAME}]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  
  // Trash View State
  const [isTrashView, setIsTrashView] = useState(false);

  // Advanced Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [activeXhr, setActiveXhr] = useState<XMLHttpRequest | null>(null);
  const [uploadProgress, setUploadProgress] = useState({
    percentage: 0, loadedBytes: 0, totalBytes: 0, speedBps: 0, etaSeconds: 0, uploadedFileNames: [] as string[]
  });

  // Action Menu State
  const [actionMenuFile, setActionMenuFile] = useState<any | null>(null);

  // Delete State
  const [fileToDelete, setFileToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create Folder State
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  useEffect(() => {
    if (isTrashView) {
      fetchTrash();
    } else {
      fetchFiles(activeFolderId);
    }
  }, [activeFolderId, isTrashView]);

  const fetchFiles = async (folderId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/gdrive/api/drive?folderId=${folderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to load files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/gdrive/api/drive/trash`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch trash");
      setFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to load trash: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setFolderHistory(prev => [...prev, { id: folderId, name: folderName }]);
    setActiveFolderId(folderId);
  };

  const navigateToBreadcrumb = (index: number) => {
    setIsTrashView(false);
    const newHistory = folderHistory.slice(0, index + 1);
    setFolderHistory(newHistory);
    setActiveFolderId(newHistory[newHistory.length - 1].id);
  };

  const openPreview = (file: any) => {
    if (file.type === 'folder' && !isTrashView) {
      navigateToFolder(file.id, file.name);
    } else if (file.type !== 'folder') {
      setPreviewFile(file);
    }
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/gdrive/api/drive/delete?fileId=${fileToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      
      setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
    } catch (err: any) {
      console.error(err);
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    setIsCreatingFolder(true);
    try {
      const res = await fetch('/gdrive/api/drive/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: newFolderName.trim(), parentId: activeFolderId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create folder");
      
      fetchFiles(activeFolderId);
      setIsCreateFolderModalOpen(false);
      setNewFolderName("");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to create folder: ${err.message}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setUploadStatus("idle");
      setUploadProgress({
        percentage: 0, loadedBytes: 0, totalBytes: 0, speedBps: 0, etaSeconds: 0, uploadedFileNames: []
      });
      setIsUploadModalOpen(true);
    }
  };

  const startUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploadStatus("uploading");

    const totalBytes = selectedFiles.reduce((acc, file) => acc + file.size, 0);
    let totalLoadedSoFar = 0;
    const startTime = Date.now();
    let lastTickTime = startTime;
    let lastTickLoaded = 0;

    const uploadedNames: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        setActiveXhr(xhr);
        xhr.open("POST", "/gdrive/api/drive/upload");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const currentTotalLoaded = totalLoadedSoFar + e.loaded;
            const percentage = Math.round((currentTotalLoaded / totalBytes) * 100);
            
            const now = Date.now();
            const timeDiff = (now - lastTickTime) / 1000;
            
            if (timeDiff > 0.5) {
              const speedBps = (currentTotalLoaded - lastTickLoaded) / timeDiff;
              const etaSeconds = speedBps > 0 ? Math.round((totalBytes - currentTotalLoaded) / speedBps) : 0;
              setUploadProgress(prev => ({
                ...prev, percentage, loadedBytes: currentTotalLoaded, totalBytes, speedBps, etaSeconds
              }));
              lastTickTime = now;
              lastTickLoaded = currentTotalLoaded;
            }
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            totalLoadedSoFar += file.size;
            uploadedNames.push(file.name);
            setUploadProgress(prev => ({ ...prev, uploadedFileNames: [...uploadedNames] }));
            resolve();
          } else {
            reject(new Error(`Failed to upload ${file.name}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network Error"));

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderId", activeFolderId);
        xhr.send(formData);
      });
    }

    setUploadStatus("done");
    if (!isTrashView) {
      fetchFiles(activeFolderId);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "folder": return <Folder className="text-yellow-500 w-10 h-10" />;
      case "image": return <ImageIcon className="text-purple-400 w-10 h-10" />;
      case "video": return <Video className="text-red-400 w-10 h-10" />;
      case "pdf": return <FileText className="text-red-500 w-10 h-10" />;
      case "excel": return <File className="text-emerald-500 w-10 h-10" />;
      default: return <File className="text-gray-400 w-10 h-10" />;
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 text-foreground relative z-10">
      {/* Top Navbar */}
      <nav className="glass bg-black/40 rounded-2xl p-4 mb-6 sm:mb-8 flex justify-between items-center shadow-2xl gap-2 sm:gap-4 border-b border-white/10 backdrop-blur-3xl">
        <div className="flex items-center gap-3">
          <a href="https://kkngiat16tanjungsari.foerta.tech/" className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 text-gray-300 hover:text-white shadow-inner shrink-0" title="Kembali ke Dashboard">
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </a>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/5 flex items-center justify-center shadow-inner shrink-0 border border-white/10 p-1">
            <img src="https://s6.imgcdn.dev/YFrPQM.png" alt="Logo KKN" className="w-full h-full object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-sm sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 drop-shadow-md tracking-wide">
            Drive KKN GIAT 16 DESA TANJUNGSARI
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setIsTrashView(!isTrashView)}
            className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-medium transition-all shadow-lg border ${isTrashView ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white border-transparent' : 'bg-black/30 border-white/10 text-gray-300 hover:bg-white/10'}`}
          >
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">{isTrashView ? 'Exit Trash' : 'Trash'}</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="glass bg-black/40 rounded-3xl p-4 sm:p-6 shadow-2xl min-h-[75vh] border border-white/10 backdrop-blur-3xl relative overflow-hidden">
        {/* Soft inner top highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        
        {/* Controls Toolbar */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-white/10 pb-5">
          
          {/* Breadcrumbs */}
          <div className="flex items-center flex-wrap gap-2 text-sm">
            {!isTrashView && folderHistory.length > 1 && (
              <button 
                onClick={() => navigateToBreadcrumb(folderHistory.length - 2)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-black/40 hover:bg-white/10 text-white transition-all shadow-inner mr-1 border border-white/10"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            
            {isTrashView ? (
              <div className="flex items-center text-red-400 font-semibold gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5 shadow-inner">
                <Trash2 className="w-4 h-4" />
                <span>Sampah (Trash)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap bg-black/30 px-3 py-1.5 rounded-lg border border-white/5 shadow-inner">
                {folderHistory.map((crumb, index) => (
                  <React.Fragment key={crumb.id}>
                    <button 
                      onClick={() => navigateToBreadcrumb(index)}
                      className={`flex items-center transition-colors drop-shadow-md ${index === folderHistory.length - 1 ? 'text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                    >
                      {index === 0 ? <Home className="w-4 h-4 mr-1 shrink-0" /> : null}
                      <span className="truncate max-w-[120px] sm:max-w-xs">{crumb.name}</span>
                    </button>
                    {index < folderHistory.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between w-full xl:w-auto gap-4 sm:gap-6 flex-wrap xl:flex-nowrap">
            
            {/* ACTION BUTTONS */}
            {!isTrashView && (
              <div className="flex items-center gap-2 sm:gap-3">
                <button 
                  onClick={() => setIsCreateFolderModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-black/40 hover:bg-white/10 shadow-inner text-gray-200 hover:text-white font-medium transition-all text-sm border border-white/10"
                >
                  <FolderPlus className="w-4 h-4" /> <span className="hidden sm:inline">New Folder</span>
                </button>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  multiple
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-orange-500/20 text-white font-bold transition-all text-sm border border-transparent"
                >
                  <Upload className="w-4 h-4" /> <span>Upload</span>
                </button>
              </div>
            )}

            <div className="hidden sm:block w-px h-8 bg-white/10 mx-2"></div>

            {/* Thumbnail Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group ml-auto xl:ml-0">
              <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Thumbnails</span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={showThumbnail} 
                  onChange={(e) => setShowThumbnail(e.target.checked)} 
                />
                <div className={`block w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-colors shadow-inner border border-white/10 ${showThumbnail ? 'bg-gradient-to-r from-pink-500 to-orange-400 border-transparent' : 'bg-black/50'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-transform shadow-md ${showThumbnail ? 'transform translate-x-5 sm:translate-x-6' : ''}`}></div>
              </div>
            </label>

            {/* View Mode Toggle */}
            <div className="flex bg-black/50 rounded-xl p-1 border border-white/10 shadow-inner">
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white/20 text-white shadow-sm" : "text-gray-500 hover:text-white"}`}
              >
                <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white/20 text-white shadow-sm" : "text-gray-500 hover:text-white"}`}
              >
                <List className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="w-12 h-12 text-orange-400 animate-spin mb-6 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
            <p className="text-gray-400 font-medium tracking-wider animate-pulse">Loading data...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] opacity-70">
            {isTrashView ? <Trash2 className="w-16 h-16 text-gray-600 mb-6" /> : <Folder className="w-16 h-16 text-gray-600 mb-6" />}
            <p className="text-gray-400 font-medium text-lg">{isTrashView ? 'Trash is empty.' : 'This folder is empty.'}</p>
          </div>
        ) : (
          /* Files Display */
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {files.map((file) => (
                <div key={file.id} onDoubleClick={() => openPreview(file)} className="bg-black/30 hover:bg-black/50 border border-white/5 hover:border-white/20 rounded-2xl p-3 sm:p-4 transition-all duration-300 sm:hover:-translate-y-1.5 cursor-pointer group relative flex flex-col h-48 sm:h-56 shadow-lg backdrop-blur-md">
                  <div className="flex-1 rounded-xl bg-white/5 flex items-center justify-center mb-3 sm:mb-4 overflow-hidden relative border border-white/5 shadow-inner" onClick={() => openPreview(file)}>
                    {showThumbnail && file.thumbnail ? (
                      <>
                        <img 
                          src={file.thumbnail} 
                          alt={file.name} 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                          className="w-full h-full object-cover transition-transform duration-700 sm:group-hover:scale-110 opacity-80 group-hover:opacity-100" 
                        />
                        <div className="hidden scale-75 sm:scale-100 drop-shadow-lg">{getFileIcon(file.type)}</div>
                      </>
                    ) : (
                      <div className="scale-75 sm:scale-100 drop-shadow-lg">{getFileIcon(file.type)}</div>
                    )}
                    
                    {/* Desktop Overlay */}
                    <div className="hidden sm:flex absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-center justify-center gap-2 backdrop-blur-sm">
                      <button onClick={(e) => { e.stopPropagation(); openPreview(file); }} className="p-2.5 rounded-full bg-white/10 hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-400 border border-white/20 text-white transition-all hover:scale-110" title={file.type === 'folder' ? "Open Folder" : "View File"}>
                        {file.type === 'folder' ? <Folder className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {file.type !== 'folder' && file.downloadLink && (
                        <a href={file.downloadLink} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-white/10 hover:bg-emerald-500 border border-white/20 text-white transition-all hover:scale-110" title="Download">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      {!isTrashView && (
                        <button onClick={(e) => { e.stopPropagation(); setFileToDelete({ id: file.id, name: file.name }); }} className="p-2.5 rounded-full bg-white/10 hover:bg-red-500 border border-white/20 text-white transition-all hover:scale-110" title="Move to Trash">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-auto flex justify-between items-start gap-1">
                    <div className="flex-1 min-w-0" onClick={() => openPreview(file)}>
                      <h3 className="font-semibold text-xs sm:text-sm truncate text-gray-300 group-hover:text-white transition-colors drop-shadow-md" title={file.name}>{file.name}</h3>
                      <div className="flex justify-between items-center mt-1.5 text-[10px] sm:text-xs text-gray-500 font-medium">
                        <span>{file.size}</span>
                      </div>
                    </div>
                    {/* More options button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActionMenuFile(file); }}
                      className="p-1 sm:p-1.5 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white transition-all shrink-0 active:scale-95"
                    >
                      <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar pb-2">
              <div className="min-w-[600px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-400 text-sm border-b border-white/10 bg-black/20">
                      <th className="py-4 font-semibold px-4 rounded-tl-xl uppercase tracking-wider text-xs">Name</th>
                      <th className="py-4 font-semibold px-4 uppercase tracking-wider text-xs">Date Modified</th>
                      <th className="py-4 font-semibold px-4 uppercase tracking-wider text-xs">Size</th>
                      <th className="py-4 font-semibold px-4 text-right rounded-tr-xl"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr key={file.id} onDoubleClick={() => openPreview(file)} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                        <td className="py-3 sm:py-4 px-4 flex items-center gap-4" onClick={() => openPreview(file)}>
                          <div className="w-10 h-10 rounded-xl bg-black/50 flex items-center justify-center shrink-0 overflow-hidden shadow-inner border border-white/5 group-hover:border-white/20 transition-colors">
                            {showThumbnail && file.thumbnail ? (
                              <>
                                <img 
                                  src={file.thumbnail} 
                                  alt={file.name} 
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                />
                                <div className="hidden scale-75 drop-shadow-md">{getFileIcon(file.type)}</div>
                              </>
                            ) : (
                              <div className="scale-75 drop-shadow-md">{getFileIcon(file.type)}</div>
                            )}
                          </div>
                          <span className="font-semibold text-sm max-w-[150px] sm:max-w-[250px] lg:max-w-md truncate text-gray-300 group-hover:text-white transition-colors drop-shadow-sm">{file.name}</span>
                        </td>
                        <td className="py-3 sm:py-4 px-4 text-xs sm:text-sm text-gray-500 font-medium">{file.date}</td>
                        <td className="py-3 sm:py-4 px-4 text-xs sm:text-sm text-gray-500 font-medium">{file.size}</td>
                        <td className="py-3 sm:py-4 px-4 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActionMenuFile(file); }}
                            className="p-2 rounded-xl text-gray-500 hover:bg-white/10 hover:text-white transition-all inline-flex active:scale-95"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {/* Action Menu Bottom Sheet */}
      {actionMenuFile && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md" onClick={() => setActionMenuFile(null)}>
          <div 
            className="glass bg-black/60 border border-white/10 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 sm:hidden shadow-inner"></div>

            <div className="p-5 sm:p-6 border-b border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-black/50 flex items-center justify-center shrink-0 overflow-hidden shadow-inner border border-white/10">
                {showThumbnail && actionMenuFile.thumbnail ? (
                  <img src={actionMenuFile.thumbnail} alt={actionMenuFile.name} className="w-full h-full object-cover" />
                ) : (
                  getFileIcon(actionMenuFile.type)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white truncate text-base sm:text-lg drop-shadow-md">{actionMenuFile.name}</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{actionMenuFile.size} • {actionMenuFile.date}</p>
              </div>
            </div>

            <div className="p-3 flex flex-col pb-8 sm:pb-3 gap-1">
              {(!isTrashView || actionMenuFile.type !== 'folder') && (
                <button 
                  onClick={() => { openPreview(actionMenuFile); setActionMenuFile(null); }}
                  className="flex items-center gap-3 px-4 py-3.5 sm:py-3 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white transition-all w-full text-left group"
                >
                  {actionMenuFile.type === 'folder' ? <Folder className="w-5 h-5 group-hover:scale-110 transition-transform" /> : <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                  <span className="font-semibold text-sm sm:text-base">{actionMenuFile.type === 'folder' ? 'Open Folder' : 'View File'}</span>
                </button>
              )}

              {actionMenuFile.type !== 'folder' && actionMenuFile.downloadLink && (
                <a 
                  href={actionMenuFile.downloadLink} 
                  onClick={() => setActionMenuFile(null)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-3 px-4 py-3.5 sm:py-3 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white transition-all w-full text-left group"
                >
                  <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm sm:text-base">Download</span>
                </a>
              )}

              {!isTrashView && (
                <button 
                  onClick={() => { setFileToDelete({ id: actionMenuFile.id, name: actionMenuFile.name }); setActionMenuFile(null); }}
                  className="flex items-center gap-3 px-4 py-3.5 sm:py-3 rounded-xl hover:bg-red-500/20 text-red-400 transition-all w-full text-left mt-1 border border-transparent hover:border-red-500/30 group"
                >
                  <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm sm:text-base">Move to Trash</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass bg-black/60 border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden relative p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsCreateFolderModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
            
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/10">
              <FolderPlus className="w-7 h-7 text-gray-300 drop-shadow-md" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-md">New Folder</h3>
            <p className="text-gray-500 text-sm mb-6 font-medium">Create a new folder in the current directory.</p>

            <form onSubmit={createFolder} className="flex flex-col gap-5">
              <input 
                type="text" 
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-white/30 transition-all shadow-inner"
                autoFocus
              />
              
              <div className="flex gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => setIsCreateFolderModalOpen(false)}
                  disabled={isCreatingFolder}
                  className="flex-1 py-3 rounded-xl text-gray-400 bg-white/5 hover:bg-white/10 font-semibold transition-all disabled:opacity-50 border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-400 hover:to-orange-300 text-white font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-transparent"
                >
                  {isCreatingFolder ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass bg-black/60 border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden relative p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-red-500/20">
              <AlertTriangle className="w-7 h-7 text-red-500 drop-shadow-md" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-md">Move to Trash?</h3>
            <p className="text-gray-400 text-sm mb-8 font-medium leading-relaxed">
              Are you sure you want to move <span className="text-gray-200 font-bold px-1 bg-white/10 rounded mx-1">{fileToDelete.name}</span> to the trash?
            </p>

            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl text-gray-400 bg-white/5 hover:bg-white/10 font-semibold transition-all disabled:opacity-50 border border-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-transparent"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                {isDeleting ? "Moving..." : "Move to Trash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md">
          <div className="glass bg-black/60 border border-white/10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-200">
            {uploadStatus !== "uploading" && (
              <button 
                onClick={() => setIsUploadModalOpen(false)} 
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-gray-500 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="p-5 sm:p-8 pb-8 sm:pb-8">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 drop-shadow-md">
                {uploadStatus === "idle" ? "Upload Files" : uploadStatus === "uploading" ? (uploadProgress.percentage === 100 ? "Saving to Cloud..." : "Uploading...") : "Upload Complete"}
              </h3>
              
              {uploadStatus === "idle" && (
                <>
                  <p className="text-gray-400 text-sm mb-6 font-medium">
                    You selected {selectedFiles.length} file(s) ({formatBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0))}).
                  </p>
                  <div className="bg-black/50 border border-white/5 rounded-2xl p-4 mb-8 max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="flex justify-between text-sm py-2 border-b border-white/5 last:border-0">
                        <span className="text-gray-300 truncate pr-4 font-medium">{f.name}</span>
                        <span className="text-gray-500 whitespace-nowrap">{formatBytes(f.size)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 rounded-xl text-gray-400 bg-white/5 hover:bg-white/10 font-semibold transition-all text-sm border border-white/5">Add More</button>
                    <button onClick={() => { setIsUploadModalOpen(false); setSelectedFiles([]); }} className="px-5 py-2.5 rounded-xl text-gray-400 bg-white/5 hover:bg-white/10 font-semibold transition-all text-sm border border-white/5">Cancel</button>
                    <button onClick={startUpload} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold shadow-lg shadow-orange-500/20 transition-all text-sm border border-transparent">
                      Start Upload
                    </button>
                  </div>
                </>
              )}

              {uploadStatus === "uploading" && (
                <div className="py-4">
                  <div className="flex justify-between text-sm mb-3 items-center">
                    <div>
                      <span className="font-bold text-orange-400">{uploadProgress.percentage}%</span>
                      <span className="text-gray-400 text-xs sm:text-sm font-medium ml-2">
                        {formatBytes(uploadProgress.loadedBytes)} / {formatBytes(uploadProgress.totalBytes)}
                      </span>
                    </div>
                    <button onClick={() => { activeXhr?.abort(); setUploadStatus("idle"); }} className="px-3 py-1 rounded-lg text-white bg-red-500/80 hover:bg-red-500 text-xs font-bold transition-all">Cancel</button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-3 sm:h-4 bg-black/60 rounded-full overflow-hidden mb-8 shadow-inner border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-orange-400 transition-all duration-300 ease-out relative"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-black/50 border border-white/5 rounded-2xl p-4 flex flex-col shadow-inner">
                      <span className="text-gray-500 text-xs mb-1 font-bold uppercase tracking-wider">Speed</span>
                      <span className="font-bold text-white text-base sm:text-lg drop-shadow-md">{formatBytes(uploadProgress.speedBps)}/s</span>
                    </div>
                    <div className="bg-black/50 border border-white/5 rounded-2xl p-4 flex flex-col shadow-inner">
                      <span className="text-gray-500 text-xs mb-1 font-bold uppercase tracking-wider">Time Left</span>
                      <span className="font-bold text-white flex items-center gap-1.5 text-base sm:text-lg drop-shadow-md">
                        <Clock className="w-4 h-4 text-orange-400" /> {formatTime(uploadProgress.etaSeconds)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-8 text-sm max-h-32 overflow-y-auto custom-scrollbar pr-2">
                    <h4 className="text-gray-600 text-[10px] sm:text-xs uppercase font-bold mb-3 tracking-wider">Uploaded Files</h4>
                    <div className="space-y-2">
                      {uploadProgress.uploadedFileNames.map((name, i) => (
                        <div key={i} className="flex items-center gap-3 text-gray-400 text-xs sm:text-sm font-medium">
                          <CheckCircle className="w-4 h-4 text-emerald-500/80 shrink-0 drop-shadow-sm" />
                          <span className="truncate">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {uploadStatus === "done" && (
                <div className="py-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-emerald-500/20">
                    <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 drop-shadow-md" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 drop-shadow-md">All files uploaded!</h3>
                  <p className="text-gray-400 text-sm mb-8 font-medium">
                    Successfully uploaded {selectedFiles.length} file(s) to the drive.
                  </p>
                  <button 
                    onClick={() => setIsUploadModalOpen(false)} 
                    className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-sm border border-white/10 shadow-lg"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && previewFile.webViewLink && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-6 bg-black/90 backdrop-blur-lg">
          <div className="glass bg-black/60 border border-white/10 w-full sm:max-w-6xl h-full sm:h-[85vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-white/5 bg-black/20 backdrop-blur-md">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-2">
                <div className="shrink-0 p-2 bg-black/50 rounded-xl border border-white/5 shadow-inner">{getFileIcon(previewFile.type)}</div>
                <h3 className="font-bold text-base sm:text-lg text-white truncate drop-shadow-md">{previewFile.name}</h3>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {previewFile.downloadLink && (
                  <a href={previewFile.downloadLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all text-sm font-bold border border-white/10 shadow-lg">
                    <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
                  </a>
                )}
                <button onClick={() => setPreviewFile(null)} className="p-2.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-transparent hover:border-white/10">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white relative">
              <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                <Loader2 className="w-10 h-10 text-gray-500 animate-spin" />
              </div>
              <iframe 
                src={previewFile.webViewLink.replace('/view', '/preview')} 
                className="w-full h-full border-0 relative z-10"
                allow="autoplay"
                title="File Preview"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
