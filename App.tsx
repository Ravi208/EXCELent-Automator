import React, { useState, useCallback, useRef } from 'react';
import { DataTable } from './components/DataTable';
import { ProgressBar } from './components/ProgressBar';
import { processExcelFile, downloadExcelFile } from './services/excelService';
import { automateExcelEdit } from './services/geminiService';
import { useLocalStorage } from './hooks/useLocalStorage';
import { UploadIcon, PlusIcon, TrashIcon, SaveIcon, DownloadIcon, ChevronDownIcon, PlayIcon, SparklesIcon, DocumentPlusIcon } from './components/icons';

type SavedSteps = {
  name: string;
  steps: string[];
};

type Data = (string | number | boolean | null)[][];

type FileData = {
  name: string;
  data: Data;
};

export default function App() {
  const [filesData, setFilesData] = useState<FileData[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Data | null>(null);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [savedSteps, setSavedSteps] = useLocalStorage<SavedSteps[]>('excel-automation-steps', []);
  const [showSavedSteps, setShowSavedSteps] = useState<boolean>(false);

  const progressInterval = useRef<number | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    try {
      setError(null);
      const newFilesPromises = Array.from(files).map(async (file) => {
        if (filesData.some((f) => f.name === file.name)) {
          // Silently ignore duplicates
          return null;
        }
        const data = await processExcelFile(file);
        return { name: file.name, data };
      });

      const newFiles = (await Promise.all(newFilesPromises)).filter(
        (f): f is FileData => f !== null
      );

      if (newFiles.length > 0) {
        const updatedFilesData = [...filesData, ...newFiles];
        setFilesData(updatedFilesData);
        if (!activeTab) {
          setActiveTab(updatedFilesData[0].name);
        }
      }
      setEditedData(null);
    } catch (err) {
      setError('Failed to process one or more Excel files. Please ensure they are valid files.');
      console.error(err);
    }
    // Reset file input to allow re-uploading the same file after removing it
    event.target.value = '';
  };
  
  const handleRemoveFile = (fileNameToRemove: string) => {
    setFilesData(currentFiles => {
        const updatedFiles = currentFiles.filter(f => f.name !== fileNameToRemove);
        if (activeTab === fileNameToRemove) {
            setActiveTab(updatedFiles.length > 0 ? updatedFiles[0].name : null);
        }
        return updatedFiles;
    });
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...instructions];
    newInstructions[index] = value;
    setInstructions(newInstructions);
  };

  const handleRemoveInstruction = (index: number) => {
    const newInstructions = instructions.filter((_, i) => i !== index);
    setInstructions(newInstructions);
  };
  
  const cleanupProgress = () => {
    if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
    }
  };

  const handleRunAutomation = useCallback(async () => {
    if (filesData.length === 0) {
      setError('Please upload at least one Excel file first.');
      return;
    }
    const validInstructions = instructions.filter(inst => inst.trim() !== '');
    if (validInstructions.length === 0) {
      setError('Please provide at least one instruction.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedData(null);
    setProgress(0);
    cleanupProgress();

    // Simulate initial progress
    setLoadingMessage('Preparing data and sending to AI...');
    setProgress(10);
    
    // Simulate "thinking" progress
    progressInterval.current = window.setInterval(() => {
        setProgress(p => {
            if (p >= 85) {
                cleanupProgress();
                return p;
            }
            return p + Math.random() * 2;
        });
    }, 200);


    try {
      const result = await automateExcelEdit(filesData, validInstructions);
      cleanupProgress();
      setProgress(90);
      setLoadingMessage('AI processing complete. Rendering results...');
      setEditedData(result);
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
      }, 500);

    } catch (err) {
      cleanupProgress();
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Automation failed: ${errorMessage}`);
      console.error(err);
      setIsLoading(false);
      setProgress(0);
    } 
  }, [filesData, instructions]);

  const handleDownload = () => {
    if (editedData) {
      const newFileName = `edited_result.xlsx`;
      downloadExcelFile(editedData, newFileName);
    }
  };
  
  const handleSaveSteps = () => {
    const validInstructions = instructions.filter(step => step.trim() !== '');
    if (validInstructions.length === 0) {
        setError("Cannot save empty instructions.");
        return;
    }
    const name = prompt("Enter a name for this instruction set:", `Automation-${savedSteps.length + 1}`);
    if (name) {
        if(savedSteps.find(s => s.name === name)) {
            if(!confirm("A set with this name already exists. Overwrite?")) {
                return;
            }
            setSavedSteps(savedSteps.map(s => s.name === name ? { name, steps: validInstructions } : s));
        } else {
            setSavedSteps([...savedSteps, { name, steps: validInstructions }]);
        }
    }
  };

  const loadSteps = (steps: string[]) => {
      setInstructions(steps.length > 0 ? steps : ['']);
      setShowSavedSteps(false);
  }

  const deleteSteps = (name: string) => {
      if(confirm(`Are you sure you want to delete "${name}"?`)) {
          setSavedSteps(savedSteps.filter(s => s.name !== name));
      }
  }

  return (
    <div className="min-h-screen bg-slate-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
             <SparklesIcon className="w-10 h-10 text-primary-600"/>
             <h1 className="text-4xl font-bold text-slate-800 tracking-tight">EXCELent Automator</h1>
          </div>
          <p className="mt-2 text-lg text-slate-600">Automate spreadsheet edits with the power of AI</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Column */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-8">
            {/* Step 1 */}
            <div className="flex flex-col gap-4">
              <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-700">
                <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">1</div>
                <span>Upload Your Files</span>
              </h2>
              <div className="space-y-4 pl-11">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-primary-600 hover:bg-primary-700 transition-all duration-300 flex justify-center items-center w-full p-4 rounded-lg text-white font-semibold gap-2 transform hover:scale-105">
                  <UploadIcon className="w-6 h-6"/>
                  <span>{filesData.length > 0 ? 'Upload More Files' : 'Upload Files (.xlsx, .csv)'}</span>
                </label>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xlsx,.csv,.xls" multiple />
                
                {filesData.length > 0 && (
                    <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                        <h3 className="text-sm font-medium text-slate-500">Uploaded Files:</h3>
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                            {filesData.map(file => (
                                <li key={file.name} className="flex items-center justify-between bg-slate-50 p-2 rounded-md group">
                                    <span className="text-sm font-medium text-slate-800 truncate" title={file.name}>{file.name}</span>
                                    <button onClick={() => handleRemoveFile(file.name)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors" aria-label={`Remove ${file.name}`}>
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
              </div>
            </div>

            <hr className="border-slate-200" />
            
            {/* Step 2 */}
            <div className="flex flex-col gap-4">
               <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-700">
                <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">2</div>
                <span>Define Automation Steps</span>
              </h2>
              <div className="flex flex-col gap-3 pl-11">
                {instructions.map((inst, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 bg-slate-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                    <input
                      type="text"
                      placeholder={`e.g., In sales.xlsx, VLOOKUP email from customers.xlsx`}
                      value={inst}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      className="flex-grow p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow duration-200"
                    />
                    <button onClick={() => handleRemoveInstruction(index)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200" aria-label="Remove instruction">
                      <TrashIcon className="w-5 h-5"/>
                    </button>
                  </div>
                ))}
              
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={handleAddInstruction} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-100 hover:bg-primary-200 rounded-lg transition-colors duration-200">
                    <PlusIcon className="w-5 h-5"/> Add Step
                  </button>
                  <button onClick={handleSaveSteps} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-200">
                    <SaveIcon className="w-5 h-5"/> Save Steps
                  </button>
                  <div className="relative">
                      <button onClick={() => setShowSavedSteps(!showSavedSteps)} disabled={savedSteps.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                          Load Steps <ChevronDownIcon className={`w-5 h-5 transition-transform ${showSavedSteps ? 'rotate-180' : ''}`}/>
                      </button>
                      {showSavedSteps && savedSteps.length > 0 && (
                          <div className="absolute z-10 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 right-0">
                            {savedSteps.map(s => (
                                <div key={s.name} className="p-2 hover:bg-slate-50 flex justify-between items-center group">
                                    <button onClick={() => loadSteps(s.steps)} className="text-left flex-grow text-sm text-slate-700">{s.name}</button>
                                    <button onClick={() => deleteSteps(s.name)} className="p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                          </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
            
            <hr className="border-slate-200" />
            
            {/* Step 3 */}
            <div className="flex flex-col gap-4">
               <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-700">
                <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">3</div>
                <span>Execute & Download</span>
              </h2>
              <div className="flex flex-col gap-4 pl-11">
                  <button
                      onClick={handleRunAutomation}
                      disabled={filesData.length === 0 || isLoading}
                      className="w-full flex items-center justify-center gap-3 px-6 py-3 text-base font-semibold text-white bg-primary-600 rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                  >
                      <PlayIcon className="w-6 h-6"/>
                      {isLoading ? (loadingMessage.split('.')[0] || 'Automating') + '...' : 'Run Automation'}
                  </button>
                  <button
                      onClick={handleDownload}
                      disabled={!editedData}
                      className="w-full flex items-center justify-center gap-3 px-6 py-3 text-base font-semibold text-primary-700 bg-white border-2 border-primary-600 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:border-slate-300 disabled:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                      <DownloadIcon className="w-6 h-6"/>
                      Download Edited File
                  </button>
                  {error && <div className="p-3 bg-red-100 border border-red-200 text-red-800 rounded-lg text-sm">{error}</div>}
              </div>
            </div>
          </div>

          {/* Data Display Column */}
          <div className="flex flex-col gap-6">
            <div className="h-[45vh] bg-white p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col">
                <h2 className="text-xl font-semibold text-slate-700 mb-2">Original Data</h2>
                {filesData.length > 0 ? (
                    <div className="flex flex-col flex-grow min-h-0">
                        <div className="border-b border-slate-200">
                            <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                                {filesData.map(file => (
                                    <button
                                        key={file.name}
                                        onClick={() => setActiveTab(file.name)}
                                        className={`${
                                            activeTab === file.name
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                                        aria-current={activeTab === file.name ? 'page' : undefined}
                                    >
                                        {file.name}
                                    </button>
                                ))}
                            </nav>
                        </div>
                        <div className="mt-4 flex-grow min-h-0">
                            <DataTable data={filesData.find(f => f.name === activeTab)?.data ?? null} />
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <DocumentPlusIcon className="w-12 h-12 text-slate-400" />
                        <p className="font-semibold">No files uploaded.</p>
                        <p className="text-sm">Upload one or more files to begin.</p>
                      </div>
                    </div>
                )}
            </div>
            <div className="flex-1 bg-white p-6 rounded-2xl shadow-xl border border-slate-200 min-h-[300px] relative flex flex-col">
              <h2 className="text-xl font-semibold text-slate-700 mb-4">Edited Data</h2>
              {isLoading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl p-8 text-center">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-700 font-semibold text-lg">{loadingMessage}</p>
                    <div className="w-full max-w-xs mt-4">
                      <ProgressBar progress={progress} />
                    </div>
                  </div>
              )}
              <div className="flex-grow min-h-0">
                 <DataTable data={editedData} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}