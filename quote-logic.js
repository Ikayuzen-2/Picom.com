document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. 데이터: 추천 견적 프리셋 (배열 구조) ---
    const pcPresets = {
        // ... (기존 게이밍/사무용 프리셋은 동일하게 유지) ...
        
        // [Gaming] 1. Competitive (Shooters)
        "gaming_comp_entry": [
            { type: "value", tag: "💰 Budget King", title: "Esports Starter", desc: "Great for League, Valorant, CS:GO at 1080p 60fps+.", priceEstimate: "$650", parts: { cpu: "Intel Core i3-12100F", gpu: "AMD Radeon RX 6600", ram: "16GB DDR4", ssd: "500GB" } },
            { type: "balance", tag: "🛡️ Stable Pick", title: "Entry GeForce", desc: "NVIDIA option for stability.", priceEstimate: "$750", parts: { cpu: "Intel Core i3-13100F", gpu: "NVIDIA GTX 1660 Super", ram: "16GB DDR4", ssd: "500GB" } }
        ],
        "gaming_comp_mid": [
            { type: "balance", tag: "🏆 Best Overall", title: "The Esports Standard", desc: "Locks 144fps in Fortnite/Apex. Smooth competitive play.", priceEstimate: "$1,100", parts: { cpu: "Intel Core i5-12400F", gpu: "NVIDIA RTX 4060", ram: "16GB DDR4", ssd: "1TB" } },
            { type: "value", tag: "💰 Best Value", title: "Budget FPS Beast", desc: "AMD combo offering amazing price-to-performance.", priceEstimate: "$950", parts: { cpu: "AMD Ryzen 5 5600", gpu: "AMD Radeon RX 7600", ram: "16GB DDR4", ssd: "1TB" } }
        ],
        "gaming_comp_high": [
            { type: "performance", tag: "🚀 Ultimate Speed", title: "240Hz Pro Monster", desc: "For serious pros. Ryzen 7800X3D ensures max FPS.", priceEstimate: "$2,200", parts: { cpu: "AMD Ryzen 7 7800X3D", gpu: "NVIDIA RTX 4070 Super", ram: "32GB DDR5", ssd: "2TB Gen4" } }
        ],

        // [Gaming] 2. AAA / Open World
        "gaming_aaa_entry": [
            { type: "value", tag: "🎮 Console Killer", title: "1080p AAA Gamer", desc: "Plays Cyberpunk, Elden Ring smoothly at 1080p High.", priceEstimate: "$900", parts: { cpu: "Intel Core i5-12400F", gpu: "NVIDIA RTX 3060 12GB", ram: "16GB DDR4", ssd: "1TB" } }
        ],
        "gaming_aaa_mid": [
            { type: "balance", tag: "⚖️ Sweet Spot", title: "1440p High Settings", desc: "Perfect for QHD gaming. Crisp visuals and good FPS.", priceEstimate: "$1,400", parts: { cpu: "Intel Core i5-13600K", gpu: "NVIDIA RTX 4070", ram: "32GB DDR5", ssd: "2TB" } }
        ],
        "gaming_aaa_ultra": [
            { type: "performance", tag: "🚀 Dream Machine", title: "4K Ray Tracing Beast", desc: "Top-tier performance. Run anything at Max settings.", priceEstimate: "$2,800", parts: { cpu: "Intel Core i9-14900K", gpu: "NVIDIA RTX 4090", ram: "64GB DDR5", ssd: "4TB" } },
            { type: "value", tag: "💰 Smart High-End", title: "4K Entry Choice", desc: "Capable of 4K gaming at a reasonable price.", priceEstimate: "$1,900", parts: { cpu: "AMD Ryzen 7 7800X3D", gpu: "NVIDIA RTX 4080 Super", ram: "32GB DDR5", ssd: "2TB" } }
        ],

        // [Gaming] 3. Casual
        "gaming_casual": [
            { type: "value", tag: "⚽ Casual King", title: "Budget All-Rounder", desc: "Perfect for FIFA, Minecraft, Roblox, and web browsing.", priceEstimate: "$600", parts: { cpu: "AMD Ryzen 5 5600G", gpu: "Integrated (Vega 7)", ram: "16GB DDR4", ssd: "500GB" } }
        ],

        // [Office]
        "office_basic": [
             { type: "value", tag: "🏢 Basic Office", title: "Home Office Essential", desc: "Fast booting, Word, Excel, YouTube.", priceEstimate: "$450", parts: { cpu: "Intel Core i3-12100", gpu: "Integrated", ram: "8GB DDR4", ssd: "500GB" } }
        ],
        "office_advanced": [
            { type: "balance", tag: "📈 Productivity Pro", title: "Multitasking Station", desc: "Handles heavy Excel, 50+ tabs, dual monitors.", priceEstimate: "$700", parts: { cpu: "Intel Core i5-13400", gpu: "Integrated", ram: "32GB DDR4", ssd: "1TB" } }
        ],

        // [Creator] Video / 3D
        "creator_entry": [
            { type: "value", tag: "🎬 YouTube Starter", title: "FHD Video Editor", desc: "Good for Premiere Pro 1080p editing.", priceEstimate: "$1,000", parts: { cpu: "Intel Core i5-13500", gpu: "NVIDIA RTX 3060", ram: "32GB DDR4", ssd: "1TB" } }
        ],
        "creator_pro": [
             { type: "performance", tag: "🎥 4K Workstation", title: "Professional Studio", desc: "Heavy 4K editing, After Effects, 3D Rendering.", priceEstimate: "$2,200", parts: { cpu: "Intel Core i7-14700K", gpu: "NVIDIA RTX 4070 Ti Super", ram: "64GB DDR5", ssd: "2TB" } }
        ],

        // ▼▼▼ [신규] Streaming Presets ▼▼▼
        "streaming_game": [
            {
                type: "balance",
                tag: "📡 Single PC Streamer",
                title: "Pro Game Streaming",
                desc: "Powerful CPU & NVIDIA GPU (NVENC) to game and stream simultaneously without lag.",
                priceEstimate: "$1,800",
                parts: { cpu: "Intel Core i7-13700K", gpu: "NVIDIA RTX 4070 Ti", ram: "32GB DDR5", ssd: "2TB Gen4" }
            },
            {
                type: "value",
                tag: "💰 Starter Streamer",
                title: "Entry Streaming",
                desc: "Good for 1080p streaming of lighter games (LoL, Valorant).",
                priceEstimate: "$1,200",
                parts: { cpu: "Intel Core i5-13500", gpu: "NVIDIA RTX 4060 Ti", ram: "32GB DDR4", ssd: "1TB" }
            }
        ],
        "streaming_vtuber": [
            {
                type: "performance",
                tag: "🐱 VTuber Ready",
                title: "VTuber Workstation",
                desc: "High core count for tracking software (VTube Studio) + Gaming + OBS.",
                priceEstimate: "$2,000",
                parts: { cpu: "AMD Ryzen 9 7900X", gpu: "NVIDIA RTX 4070 Super", ram: "32GB DDR5", ssd: "2TB" }
            }
        ],
        "streaming_chat": [
            {
                type: "value",
                tag: "🎙️ Just Chatting",
                title: "IRL / Podcast PC",
                desc: "Silent operation, optimized for OBS and camera inputs. No heavy GPU needed.",
                priceEstimate: "$800",
                parts: { cpu: "AMD Ryzen 7 5700X", gpu: "NVIDIA RTX 3050", ram: "16GB", ssd: "1TB" }
            }
        ],
        // ▲▲▲ [신규 프리셋 끝] ▲▲▲

        // Default
        "default_fallback": [
            { type: "balance", tag: "Standard Pick", title: "Solid All-Rounder", desc: "Great for mixed usage.", priceEstimate: "$800", parts: { cpu: "Intel Core i5-12400F", gpu: "NVIDIA RTX 3060", ram: "16GB", ssd: "1TB" } }
        ]
    };


    // --- 2. 데이터: 질문 리스트 (Logic) ---
    const questions = [
        // Q1. 용도
        {
            id: 1,
            text: "What is your primary use for this PC?",
            options: [
                { text: "🎮 Gaming", sub: "Fortnite, COD, GTA V, etc.", next: 2 },
                { text: "🏢 Home & Office", sub: "Web, Excel, Netflix", next: 10 },
                { text: "🎨 Content Creation", sub: "Editing, 3D, Streaming", next: 20 } // [수정] Streaming 텍스트 추가
            ]
        },
        
        // --- Branch: Gaming ---
        {
            id: 2,
            text: "What kind of games do you play?",
            options: [
                { text: "🔫 Competitive Shooters", sub: "Fortnite, Valorant, Apex", next: 3 },
                { text: "🌍 AAA / Open World", sub: "F125, Elden Ring", next: 4 },
                { text: "⚽ Casual / Sports", sub: "FIFA, Minecraft, Roblox", value: "gaming_casual" }
            ]
        },
        {
            id: 3,
            text: "What is your target performance?",
            options: [
                { text: "🙂 Just Playable (60 FPS)", value: "gaming_comp_entry" }, 
                { text: "😎 Smooth (144 FPS)", value: "gaming_comp_mid" },
                { text: "🏆 Pro Level (240+ FPS)", value: "gaming_comp_high" }
            ]
        },
        {
            id: 4,
            text: "What graphics quality do you want?",
            options: [
                { text: "Standard (1080p)", value: "gaming_aaa_entry" }, 
                { text: "High Quality (1440p)", value: "gaming_aaa_mid" }, 
                { text: "Ultra / 4K (Max)", value: "gaming_aaa_ultra" }
            ]
        },

        // --- Branch: Office ---
        {
            id: 10,
            text: "How intensive is your workload?",
            options: [
                { text: "Light / Basic", sub: "Browsing, Email, YouTube", value: "office_basic" },
                { text: "Heavy Multitasking", sub: "Many tabs, Huge Excel files", value: "office_advanced" }
            ]
        },

        // --- Branch: Creator / Streaming (ID 20~) ---
        {
            id: 20,
            text: "What is your main activity?",
            options: [
                { text: "🎬 Video Editing / 3D", sub: "Premiere, Blender, After Effects", next: 21 },
                { text: "📡 Streaming / Broadcasting", sub: "Twitch, YouTube Live", next: 22 } // [신규] 스트리밍 분기
            ]
        },
        // Q21. Video/3D Level
        {
            id: 21,
            text: "What is your experience level?",
            options: [
                { text: "Student / Hobbyist", sub: "1080p editing, Learning tools", value: "creator_entry" },
                { text: "Professional", sub: "4K editing, Client work", value: "creator_pro" }
            ]
        },
        // ▼▼▼ [신규] Q22. Streaming Type ▼▼▼
        {
            id: 22,
            text: "What kind of content do you stream?",
            options: [
                { text: "🎮 Game Streaming", sub: "Playing & Streaming same PC", value: "streaming_game" },
                { text: "🐱 VTubing", sub: "Virtual Avatar + Gaming", value: "streaming_vtuber" },
                { text: "🎙️ Just Chatting / IRL", sub: "Talk show, Podcast, Cam only", value: "streaming_chat" }
            ]
        }
    ];

    // --- 3. 로직 및 상태 관리 ---
    let historyStack = []; 

    // UI Elements
    const quizBox = document.getElementById('quiz-box');
    const loadingBox = document.getElementById('loading-box');
    const resultBox = document.getElementById('result-box');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const btnBack = document.getElementById('btn-back');

    // 추천 로직
    function findBestPC(finalValue) {
        return pcPresets[finalValue] || pcPresets["default_fallback"];
    }

    // 질문 렌더링
    function renderQuestion(qId) {
        const q = questions.find(item => item.id === qId);
        if (!q) return;

        questionText.textContent = q.text;
        optionsContainer.innerHTML = '';
        
        // Progress (단순 계산)
        const step = historyStack.length + 1;
        const total = 3; 
        const percent = Math.min((step / total) * 100, 100);
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `Step ${step}`;

        btnBack.style.display = historyStack.length > 0 ? 'inline-block' : 'none';

        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn-option';
            
            let html = `<span class="opt-title">${opt.text}</span>`;
            if (opt.sub) html += `<br><span class="opt-sub">${opt.sub}</span>`;
            btn.innerHTML = html;

            btn.onclick = () => {
                historyStack.push(qId);
                if (opt.next) {
                    renderQuestion(opt.next);
                } else {
                    showLoading(opt.value); 
                }
            };
            optionsContainer.appendChild(btn);
        });
    }

    // 뒤로 가기
    btnBack.addEventListener('click', () => {
        if (historyStack.length > 0) {
            const prevId = historyStack.pop();
            renderQuestion(prevId);
        }
    });

    // 로딩 화면
    function showLoading(value) {
        quizBox.style.display = 'none';
        loadingBox.style.display = 'block';
        
        // [100% 채우기]
        progressBar.style.width = '100%';
        progressText.textContent = 'Complete';
        
        const texts = ["Analyzing requirements...", "Checking compatibility...", "Selecting best parts...", "Finalizing build..."];
        const p = document.getElementById('loading-text');
        let i = 0;
        const interval = setInterval(() => {
            p.textContent = texts[i % texts.length];
            i++;
        }, 700);

        setTimeout(() => {
            clearInterval(interval);
            loadingBox.style.display = 'none';
            showResult(value);
        }, 2500);
    }

    // 결과 화면
    function showResult(value) {
        const resultsArray = findBestPC(value);
        
        resultBox.style.display = 'block';
        
        const container = document.getElementById('result-parts');
        container.innerHTML = '<div class="results-grid" id="cards-container"></div>';
        const cardsContainer = document.getElementById('cards-container');

        resultsArray.forEach(build => {
            const card = document.createElement('div');
            card.className = 'result-card';
            
            let tagClass = '';
            if (build.type === 'value') tagClass = 'value';
            if (build.type === 'performance') tagClass = 'performance';
            if (build.type === 'balance') tagClass = 'balance'; 

            let partsHtml = '<div class="mini-parts-list" style="margin-top:15px; font-size:0.9em; color:#555;">';
            for (const [key, val] of Object.entries(build.parts)) {
                partsHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span style="font-weight:600; color:#888;">${key.toUpperCase()}</span>
                    <span>${val}</span>
                </div>`;
            }
            partsHtml += '</div>';

            card.innerHTML = `
                <span class="tag-badge ${tagClass}">${build.tag}</span>
                <h3 style="margin:0; font-size:1.3em;">${build.title}</h3>
                <p style="color:#666; font-size:0.9em; margin-top:5px;">${build.desc}</p>
                <div class="price-est">${build.priceEstimate}</div>
                <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                ${partsHtml}
                <button class="form-button" style="margin-top:20px; width:100%;">See Details</button>
            `;
            cardsContainer.appendChild(card);
        });
    }

    // 시작
    renderQuestion(1);

});