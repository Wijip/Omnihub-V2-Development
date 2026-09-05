const fs = require('fs');

let code = fs.readFileSync('src/pages/Studio.tsx', 'utf-8');

// Inject activeTab state
const stateSearch = `  const [videos, setVideos] = useState<any[]>([]);`;
const stateReplace = `  const [videos, setVideos] = useState<any[]>([]);\n  const [activeTab, setActiveTab] = useState<'videos' | 'live'>('videos');`;
code = code.replace(stateSearch, stateReplace);

// Inject tabs
const titleSearch = `        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
              Your Content ({videos.length})
            </h2>
          </div>
        </div>`;

const titleReplace = `        {/* Navigasi Tab Konten Baru (Tahap 43.4) */}
        <div className="flex border-b border-neutral-800 mb-6 gap-6">
            <button 
                onClick={() => setActiveTab('videos')}
                className={\`pb-3 text-sm font-bold border-b-2 transition-all \${activeTab === 'videos' ? 'border-brand-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}\`}
            >
                Video Upload
            </button>
            <button 
                onClick={() => setActiveTab('live')}
                className={\`pb-3 text-sm font-bold border-b-2 transition-all \${activeTab === 'live' ? 'border-red-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}\`}
            >
                Siaran Langsung (Live)
            </button>
        </div>`;
code = code.replace(titleSearch, titleReplace);

// Inject filteredVideos mapping
const mapSearch = `          {videos.length === 0 ? (`;
const mapReplace = `          {(() => {
            const filteredVideos = videos.filter((video: any) => {
              const isLiveContent = (video.url || '').includes('live_stream') || (video.url || '').includes('Camera_Record') || (video.title || '').toLowerCase().includes('live');
              return activeTab === 'live' ? isLiveContent : !isLiveContent;
            });
            return filteredVideos.length === 0 ? (`;
code = code.replace(mapSearch, mapReplace);

const mapRenderSearch = `          ) : (
            videos.map((video, idx) => (`;
const mapRenderReplace = `          ) : (
            filteredVideos.map((video, idx) => (`;
code = code.replace(mapRenderSearch, mapRenderReplace);

const endSearch = `                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}`;
const endReplace = `                </button>
              </motion.div>
            ))
          )}
          })()}
        </div>
      </div>
    </div>
  );
}`;
code = code.replace(endSearch, endReplace);

fs.writeFileSync('src/pages/Studio.tsx', code);
